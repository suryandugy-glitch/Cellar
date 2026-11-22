package io.cellar.web;

import com.sun.net.httpserver.*;
import io.cellar.*;
import javax.net.ssl.*;
import java.io.*;
import java.nio.file.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Lightweight HTTP(S) front end: no accounts, optional shared access key. All business logic runs here and in the engine; the browser receives only a thin UI
 * and JSON results. Every request passes the same pipeline, in this order:
 *   host check -> rate limit -> route/method -> origin + content-type -> optional access key -> bounded body -> handler.
 */
public final class WebServer implements AutoCloseable {
    static { // JDK HttpServer slow-client limits; read once when the server classes initialise
        for (String[] p : new String[][]{{"maxReqTime", "20"}, {"maxRspTime", "60"}, {"idleInterval", "30"}, {"maxIdleConnections", "100"}, {"maxReqHeaders", "60"}})
            System.getProperties().putIfAbsent("sun.net.httpserver." + p[0], p[1]);
    }
    interface Handler { Object handle(Ctx c) throws Exception; }
    record Route(boolean needsKey, boolean heavy, int bodyLimit, Handler handler) {}
    private static final String ME = "you";
    static final class HttpError extends RuntimeException { final int status; HttpError(int status, String m) { super(m); this.status = status; } }
    static final class Ctx {
        HttpExchange x; String ip; Map<String, Object> body = Map.of();
    }

    private static final int SMALL = 64 * 1024, CONFIG = 1024 * 1024, CHECK = FilesEx.MAX_BYTES + 1024 * 1024, DIFF = 2 * FilesEx.MAX_BYTES + 1024 * 1024;
    private static final Set<String> FRONTEND_HEADERS = Set.of("content-type", "x-access-key");
    private final WebConfig cfg; private final HttpServer server; private final ExecutorService executor;
    private final WorkspaceLock workspaceLock;
    private final AtomicBoolean closing = new AtomicBoolean();
    private final Workspace workspace; private final Audit audit; private final Ai ai; private final Semaphore aiPermits = new Semaphore(2);
    private final RateLimiter limiter = new RateLimiter(50_000);
    private final RateLimiter authLogLimiter = new RateLimiter(10_000);
    private final Object authFloodLock = new Object();
    private long authFloodWindowStart = System.currentTimeMillis();
    private int authFailedCount = 0;
    private boolean authFloodLogged = false;
    private static final int AUTH_FLOOD_THRESHOLD = 50;
    private final Semaphore checkPermits = new Semaphore(2);
    private final Map<String, Route> routes = new HashMap<>(); private final Map<String, byte[]> statics = new HashMap<>(); private final Map<String, String> staticTypes = new HashMap<>();
    private final Set<String> allowedHosts = new HashSet<>(), allowedOrigins = new HashSet<>();
    

    public WebServer(WebConfig cfg) throws Exception { this(cfg, Ai.fromEnv(System.getenv())); }
    public WebServer(WebConfig cfg, Ai ai) throws Exception {
        cfg.validate();
        this.cfg = cfg; this.ai = ai;
        SSLContext ssl = cfg.tls() ? tlsContext(cfg) : null;
        InetSocketAddress addr = new InetSocketAddress(cfg.bindHost(), cfg.port());
        workspaceLock = WorkspaceLock.acquire(cfg.dataDir());
        HttpServer bound = null;
        try {
            if (ssl != null) {
                HttpsServer https = HttpsServer.create(addr, 64);
                bound = https;
                https.setHttpsConfigurator(tlsConfigurator(ssl));
            } else {
                bound = HttpServer.create(addr, 64);
            }
            server = bound;
            Crypto crypto = Crypto.load(cfg.masterKeyEnv(), cfg.dataDir().toAbsolutePath().resolve("master.key"));
            Vault vault = new Vault(cfg.dataDir(), crypto);
            audit = new Audit(vault, crypto);
            workspace = new Workspace(vault);
            initializeRoutes();
            executor = new ThreadPoolExecutor(16, 16, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(32));
            server.setExecutor(executor);
            server.createContext("/", this::handle);
            startInbox();
        } catch (Exception e) {
            if (bound != null) bound.stop(0);
            try { workspaceLock.close(); } catch (IOException closeError) { e.addSuppressed(closeError); }
            throw e;
        }
    }

    private void initializeRoutes() throws IOException {
        int port = server.getAddress().getPort();
        if (cfg.publicOrigin() != null) {
            allowedHosts.add(cfg.publicOrigin().getRawAuthority());
            allowedOrigins.add(cfg.publicOrigin().toString());
        } else {
            String scheme = cfg.tls() ? "https" : "http";
            for (String host : List.of("127.0.0.1", "localhost", "[::1]")) {
                String authority = port == (cfg.tls() ? 443 : 80) ? host : host + ":" + port;
                allowedHosts.add(authority);
                allowedOrigins.add(scheme + "://" + authority);
            }
        }

        loadStatic("/", "index.html", "text/html; charset=utf-8"); loadStatic("/app.js", "app.js", "text/javascript; charset=utf-8");
        loadStatic("/app.css", "app.css", "text/css; charset=utf-8"); loadStatic("/logo.svg", "logo.svg", "image/svg+xml");
        registerRoutes();
    }

    public void start() { server.start(); }
    public int port() { return server.getAddress().getPort(); }
    @Override public void close() {
        if (!closing.compareAndSet(false, true)) return;
        if (inboxPool != null) inboxPool.shutdown();
        server.stop(3);
        executor.shutdown();
        try {
            boolean workersStopped = stopWorkers(executor);
            boolean inboxStopped = inboxPool == null || stopWorkers(inboxPool);
            if (workersStopped && inboxStopped) workspaceLock.close();
            else System.err.println("WARNING  Workspace remains locked while background work is still running.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (IOException e) {
            System.err.println("WARNING  Could not close the workspace lock.");
        }
    }

    private static boolean stopWorkers(ExecutorService service) throws InterruptedException {
        if (service.awaitTermination(3, TimeUnit.SECONDS)) return true;
        service.shutdownNow();
        return service.awaitTermination(2, TimeUnit.SECONDS);
    }

    // ------------------------------------------------------------------ routes
    private void registerRoutes() {
        route("GET", "/api/health", false, SMALL, c -> Json.map("status", "ok"));
        route("GET", "/api/ready", false, SMALL, c -> {
            if (closing.get() || !Files.isWritable(cfg.dataDir())) throw new HttpError(503, "Workspace is unavailable.");
            return Json.map("status", "ready");
        });
        route("GET", "/api/session", false, SMALL, c -> Json.map("keyRequired", cfg.accessKey() != null, "version", Main.VERSION, "ai", ai.enabled()));
        route("GET", "/api/demo", true, SMALL, c -> Json.map("config", Json.parse(Demo.CONFIG), "csv", Demo.CSV, "brokenCsv", Demo.csv(true)));
        route("GET", "/api/config", true, SMALL, c -> workspace.config());
        route("PUT", "/api/config", true, CONFIG, this::saveConfig);
        route("GET", "/api/revisions", true, SMALL, c -> Json.map("revisions", workspace.revisions()));
        route("POST", "/api/restore", true, SMALL, c -> { var r = workspace.restore(str(c.body, "hash"), ME); audit.log(ME, c.ip, "CONFIG_RESTORED", "revision " + str(c.body, "hash").substring(0, Math.min(12, str(c.body, "hash").length()))); return r; });
        route("POST", "/api/ai", true, CONFIG, this::ai);
        heavyRoute("/api/check", CHECK, this::check);
        heavyRoute("/api/diff", DIFF, this::diff);
        heavyRoute("/api/scout", CHECK, c -> Agents.scout(str(c.body, "csv"), workspace.contract().delimiter()));
        route("GET", "/api/history", true, SMALL, c -> Json.map("history", workspace.history()));
        route("GET", "/api/stats", true, SMALL, c -> stats());
        route("GET", "/api/live", true, SMALL, c -> Json.map("inbox", inbox == null ? "" : inbox.toString(), "entries", liveSnapshot()));
        route("GET", "/api/activity", true, SMALL, c -> Json.map("entries", audit.recent(200)));
        route("GET", "/api/activity/verify", true, SMALL, c -> { var v = audit.verify(); return Json.map("ok", v.ok(), "entries", v.entries(), "head", v.head(), "problem", v.problem()); });
    }
    private void route(String method, String path, boolean needsKey, int limit, Handler h) {
        routes.put(method + " " + path, new Route(needsKey, false, limit, h));
    }
    private void heavyRoute(String path, int limit, Handler h) {
        routes.put("POST " + path, new Route(true, true, limit, h));
    }

    private Object saveConfig(Ctx c) {
        if (!c.body.containsKey("config")) throw new InputError("config is required.");
        var r = workspace.save(c.body.get("config"), str(c.body, "revision"), ME);
        audit.log(ME, c.ip, "CONFIG_SAVED", "revision " + ((String) r.get("revision")).substring(0, 12)); return r;
    }
    private Object check(Ctx c) throws Exception {
        if (c.body.containsKey("advisory") && !(c.body.get("advisory") instanceof Boolean)) throw new InputError("advisory must be boolean.");
        limit("check:" + c.ip, 30, 60);
        return runCheck(str(c.body, "csv"), Boolean.TRUE.equals(c.body.get("advisory")), c.ip, ME);
    }
    /** One path for manual and automatic checks, so agents, history and the activity log never disagree. */
    private Map<String, Object> runCheck(String csv, boolean advisory, String ip, String source) {
        var result = new LinkedHashMap<>(Checker.check(workspace.contract(), csv, advisory));
        List<?> base = workspace.record(result, source);
        result.put("agents", Agents.run(result, base));
        audit.log(source, ip, "CHECK", "passed=" + result.get("passed") + " blocking=" + result.get("blocking") + " rows=" + result.get("rowsChecked"));
        return result;
    }
    // ---- inbox agent: drop a .csv into <data>/inbox (or CELLAR_INBOX) and it is checked automatically
    private record FileStamp(java.nio.file.attribute.FileTime modified, long size, Object key) {}
    private final List<Object> live = Collections.synchronizedList(new ArrayList<>());
    private final Map<String, FileStamp> seen = new HashMap<>();
    private Path inbox; private final long started = System.currentTimeMillis();
    private List<Object> liveSnapshot() { synchronized (live) { return new ArrayList<>(live); } }
    private void startInbox() {
        String env = System.getenv("CELLAR_INBOX"); inbox = (env != null && !env.isBlank() ? Path.of(env) : cfg.dataDir().resolve("inbox")).toAbsolutePath();
        try { Files.createDirectories(inbox); } catch (IOException e) { System.err.println("WARNING  Inbox folder unavailable: " + inbox); return; }
        ScheduledExecutorService ex = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r, "cellar-inbox"); t.setDaemon(true); return t; });
        ex.scheduleWithFixedDelay(this::inboxTick, 1, 2, TimeUnit.SECONDS); inboxPool = ex;
    }
    private ScheduledExecutorService inboxPool;
    void inboxTick() {
        try (var files = Files.list(inbox)) {
            for (Path p : files.sorted().toList()) {
                if (closing.get() || Thread.currentThread().isInterrupted()) return;
                String name = p.getFileName().toString();
                if (!name.toLowerCase(Locale.ROOT).endsWith(".csv")) continue;
                BasicFileAttributes attr;
                try { attr = Files.readAttributes(p, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS); }
                catch (IOException e) { continue; }
                if (!attr.isRegularFile()) continue;
                FileStamp stamp = new FileStamp(attr.lastModifiedTime(), attr.size(), attr.fileKey());
                if (stamp.equals(seen.get(name))) continue;
                if (!checkPermits.tryAcquire()) break;
                Map<String, Object> entry = new LinkedHashMap<>(); entry.put("file", name); entry.put("at", java.time.Instant.now().toString());
                try {
                    if (attr.size() > FilesEx.MAX_BYTES) throw new InputError("File is larger than the size limit.");
                    byte[] bytes;
                    try (InputStream input = Files.newInputStream(p, LinkOption.NOFOLLOW_LINKS)) {
                        bytes = input.readNBytes(FilesEx.MAX_BYTES + 1);
                    }
                    if (bytes.length > FilesEx.MAX_BYTES) throw new InputError("File is larger than the size limit.");
                    var r = runCheck(FilesEx.decode(bytes), false, "inbox", "inbox");
                    entry.put("passed", r.get("passed")); entry.put("blocking", r.get("blocking")); List<Object> bad = new ArrayList<>();
                    for (Object o : (List<?>) r.get("results")) { var m = Json.object(o); if (!Boolean.TRUE.equals(m.get("passed"))) bad.add(m.get("integration")); } entry.put("failing", bad);
                } catch (IOException e) { continue; }
                catch (InputError e) { entry.put("error", e.getMessage()); }
                catch (RuntimeException e) { entry.put("error", "Could not check this file."); }
                finally { checkPermits.release(); }
                seen.put(name, stamp);
                synchronized (live) {
                    live.add(0, entry);
                    while (live.size() > 30) live.remove(live.size() - 1);
                }
            }
            seen.keySet().removeIf(name -> !Files.isRegularFile(inbox.resolve(name), LinkOption.NOFOLLOW_LINKS));
        } catch (Exception e) { /* folder briefly unavailable: try again next tick */ }
    }
    private Object stats() {
        var h = workspace.history(); int blocked = 0, passed = 0; for (Object o : h) { var m = Json.object(o); if (Boolean.TRUE.equals(m.get("blocking"))) blocked++; if (Boolean.TRUE.equals(m.get("passed"))) passed++; }
        return Json.map("runs", h.size(), "passed", passed, "blocked", blocked, "integrations", workspace.contract().integrations().size(), "uptimeSeconds", (System.currentTimeMillis() - started) / 1000, "inbox", inbox == null ? "" : inbox.toString());
    }
    private Object ai(Ctx c) throws Exception {
        if (!ai.enabled()) throw new InputError("AI agents are off. Set CELLAR_AI_KEY on the server to turn them on.");
        limit("ai:" + c.ip, 5, 10);
        String task = str(c.body, "task"), q = c.body.get("question") instanceof String x ? x : "", ask = Ai.prompt(task, q);
        if (!aiPermits.tryAcquire()) throw new HttpError(503, "The AI helper is busy. Try again shortly.");
        try {
            String text = ai.complete(Ai.SYSTEM, ask + "\n\n<data>" + Ai.context(workspace.config().get("config"), c.body.get("report")) + "</data>");
            audit.log(ME, c.ip, "AI", task + " via " + ai.model()); return Json.map("text", text, "model", ai.model());
        } finally { aiPermits.release(); }
    }
    private Object diff(Ctx c) {
        var report = Checker.diff(workspace.contract(), str(c.body, "before"), str(c.body, "after"));
        audit.log(ME, c.ip, "DIFF", "added=" + ((List<?>) report.get("added")).size() + " removed=" + ((List<?>) report.get("removed")).size());
        return report;
    }

    // ------------------------------------------------------------------ pipeline
    private void handle(HttpExchange x) throws IOException {
        Ctx c = new Ctx(); c.x = x;
        String requestId = Crypto.token(12);
        x.getResponseHeaders().set("X-Request-ID", requestId);
        boolean checkSlot = false;
        try {
            String path = x.getRequestURI().getRawPath(), method = x.getRequestMethod();
            String host = x.getRequestHeaders().getFirst("Host");
            if (host == null || !allowedHosts.contains(host.toLowerCase(Locale.ROOT))) throw new HttpError(400, "Unrecognised host.");      // DNS-rebinding defence
            if (cfg.trustProxy() && !List.of("https").equals(x.getRequestHeaders().get("X-Forwarded-Proto")))
                throw new HttpError(400, "HTTPS forwarding is required.");
            boolean fromFrontend = allowFrontend(x, path);
            c.ip = clientIp(x);
            if (!limiter.allow("ip:" + c.ip, 200, 120)) throw new HttpError(429, "Too many requests. Slow down.");

            if (cfg.frontendOrigin() != null && method.equals("OPTIONS") && path.startsWith("/api/")) {
                preflight(x, path, fromFrontend);
                return;
            }
            if (method.equals("GET") && statics.containsKey(path)) { sendBytes(x, 200, statics.get(path), staticTypes.get(path), "no-cache"); return; }
            Route route = routes.get(method + " " + path);
            if (route == null) {
                boolean known = routes.keySet().stream().anyMatch(k -> k.substring(k.indexOf(' ') + 1).equals(path)) || statics.containsKey(path);
                throw new HttpError(known ? 405 : 404, known ? "Method not allowed." : "Not found.");
            }
            boolean mutating = !method.equals("GET");
            if (mutating) {
                String origin = x.getRequestHeaders().getFirst("Origin");
                if (!fromFrontend && (origin == null || !allowedOrigins.contains(origin))) throw new HttpError(403, "Cross-origin request rejected.");
                String site = x.getRequestHeaders().getFirst("Sec-Fetch-Site");
                if (site != null && !site.equals("same-origin") &&
                    !(fromFrontend && (site.equals("cross-site") || site.equals("same-site"))))
                    throw new HttpError(403, "Cross-site request rejected.");
                String ct = x.getRequestHeaders().getFirst("Content-Type");
                if (ct == null || !ct.toLowerCase(Locale.ROOT).split(";", 2)[0].trim().equals("application/json")) throw new HttpError(415, "Use application/json.");
            }
            if (route.needsKey() && cfg.accessKey() != null) {
                if (!Crypto.equal(cfg.accessKey(), Objects.toString(x.getRequestHeaders().getFirst("X-Access-Key"), ""))) {
                    recordFailedAuth(c.ip);
                    limit("key:" + c.ip, 20, 30);
                    throw new HttpError(401, "Access key required.");
                }
            }
            if (mutating) {
                String length = x.getRequestHeaders().getFirst("Content-Length");
                if (length != null && Long.parseLong(length) > route.bodyLimit()) throw new HttpError(413, "Request is too large.");
                if (route.heavy()) {
                    if (!checkPermits.tryAcquire()) throw new HttpError(503, "Too many checks running. Retry shortly.");
                    checkSlot = true;
                }
                byte[] bytes = x.getRequestBody().readNBytes(route.bodyLimit() + 1);
                if (bytes.length > route.bodyLimit()) throw new HttpError(413, "Request is too large.");
                c.body = Json.object(Json.parse(FilesEx.decode(bytes), route.bodyLimit()));
            }
            Object result = route.handler().handle(c);
            sendJson(x, 200, result);
        } catch (HttpError e) {
            if (e.status == 429) x.getResponseHeaders().set("Retry-After", "30");
            if (e.status == 503) x.getResponseHeaders().set("Retry-After", "2");
            sendJson(x, e.status, Json.map("error", e.getMessage()));
        } catch (Workspace.Conflict e) { sendJson(x, 409, Json.map("error", e.getMessage()));
        } catch (Ai.ServiceError e) {
            if (e.status == 503 || e.status == 504) x.getResponseHeaders().set("Retry-After", "15");
            sendJson(x, e.status, Json.map("error", e.getMessage()));
        } catch (InputError e) { sendJson(x, 400, Json.map("error", e.getMessage()));
        } catch (IOException e) {
            throw e; // The client disconnected or the transport failed during the exchange.
        } catch (Exception e) {
            System.err.println("ERROR " + requestId + " " + e.getClass().getSimpleName());
            sendJson(x, 500, Json.map("error", "Internal error. Reference " + requestId + "."));
        } finally {
            if (checkSlot) checkPermits.release();
            x.close();
        }
    }

    private boolean allowFrontend(HttpExchange exchange, String path) {
        if (cfg.frontendOrigin() == null || !path.startsWith("/api/")) return false;
        var response = exchange.getResponseHeaders();
        response.add("Vary", "Origin");
        String origin = cfg.frontendOrigin().toString();
        if (!List.of(origin).equals(exchange.getRequestHeaders().get("Origin"))) return false;
        response.set("Access-Control-Allow-Origin", origin);
        return true;
    }

    private void preflight(HttpExchange exchange, String path, boolean fromFrontend) throws IOException {
        var request = exchange.getRequestHeaders();
        var response = exchange.getResponseHeaders();
        response.add("Vary", "Access-Control-Request-Method, Access-Control-Request-Headers");
        if (!fromFrontend) throw new HttpError(403, "Cross-origin request rejected.");
        String method = request.getFirst("Access-Control-Request-Method");
        if (!routes.containsKey(method + " " + path)) throw new HttpError(405, "Method not allowed.");
        for (String list : request.getOrDefault("Access-Control-Request-Headers", List.of())) {
            for (String header : list.split(",")) {
                if (!FRONTEND_HEADERS.contains(header.trim().toLowerCase(Locale.ROOT)))
                    throw new HttpError(403, "Cross-origin request header rejected.");
            }
        }
        response.set("Cache-Control", "no-store");
        response.set("Access-Control-Allow-Methods", method);
        response.set("Access-Control-Allow-Headers", "Content-Type, X-Access-Key");
        response.set("Access-Control-Max-Age", "300");
        exchange.sendResponseHeaders(204, -1);
    }

    // ------------------------------------------------------------------ helpers
    private void limit(String key, int burst, double perMinute) { if (!limiter.allow(key, burst, perMinute)) throw new HttpError(429, "Too many attempts. Wait a minute."); }

    private void recordFailedAuth(String ip) {
        long now = System.currentTimeMillis();
        boolean triggerFlood = false;
        synchronized (authFloodLock) {
            if (now - authFloodWindowStart >= 60_000) {
                authFloodWindowStart = now;
                authFailedCount = 0;
                authFloodLogged = false;
            }
            authFailedCount++;
            if (authFailedCount >= AUTH_FLOOD_THRESHOLD && !authFloodLogged) {
                authFloodLogged = true;
                triggerFlood = true;
            }
        }
        if (triggerFlood) {
            try { audit.log("system", ip, "AUTH_FLOOD", "Excessive failed authentication attempts: " + authFailedCount + " in 1 minute"); } catch (Exception ignored) {}
        }
        if (authLogLimiter.allow("ip:" + ip, 1, 1.0) && authLogLimiter.allow("global", 10, 10.0)) {
            try { audit.log("anonymous", ip, "AUTH_FAILED", "Invalid or missing access key"); } catch (Exception ignored) {}
        }
    }
    private static String str(Map<String, Object> body, String key) { if (!(body.get(key) instanceof String s)) throw new InputError(key + " must be a string."); return s; }

    private String clientIp(HttpExchange x) {
        String remote = x.getRemoteAddress().getAddress().getHostAddress();
        if (!cfg.trustProxy()) return remote;
        String xff = x.getRequestHeaders().getFirst("X-Forwarded-For");
        if (xff == null) return remote;
        String last = xff.substring(xff.lastIndexOf(',') + 1).trim();                  // rightmost = the address our own proxy saw
        return last.matches("[0-9a-fA-F:.]{2,45}") ? last : remote;
    }
    private void loadStatic(String path, String resource, String type) throws IOException {
        try (InputStream in = WebServer.class.getResourceAsStream("/web/" + resource)) {
            if (in == null) throw new IOException("Missing bundled resource " + resource);
            statics.put(path, in.readAllBytes()); staticTypes.put(path, type);
        }
    }
    private void sendJson(HttpExchange x, int status, Object body) throws IOException { sendBytes(x, status, Json.write(body).getBytes(StandardCharsets.UTF_8), "application/json; charset=utf-8", "no-store"); }
    private void sendBytes(HttpExchange x, int status, byte[] bytes, String type, String cache) throws IOException {
        Headers h = x.getResponseHeaders();
        h.set("Content-Type", type); h.set("Cache-Control", cache);
        h.set("X-Content-Type-Options", "nosniff"); h.set("X-Frame-Options", "DENY"); h.set("Referrer-Policy", "no-referrer");
        h.set("Cross-Origin-Opener-Policy", "same-origin"); h.set("Cross-Origin-Resource-Policy", "same-origin");
        h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
        h.set("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
        if (cfg.tls() || cfg.trustProxy()) h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        x.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        if (bytes.length > 0) try (OutputStream out = x.getResponseBody()) { out.write(bytes); }
    }
    private static SSLContext tlsContext(WebConfig cfg) throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (InputStream in = new FileInputStream(cfg.tlsKeystore())) { ks.load(in, cfg.tlsPassword().toCharArray()); }
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm()); kmf.init(ks, cfg.tlsPassword().toCharArray());
        SSLContext ctx = SSLContext.getInstance("TLS"); ctx.init(kmf.getKeyManagers(), null, null);
        return ctx;
    }
    private static HttpsConfigurator tlsConfigurator(SSLContext ctx) {
        return new HttpsConfigurator(ctx) {
            @Override public void configure(HttpsParameters p) { SSLParameters sp = ctx.getDefaultSSLParameters(); sp.setProtocols(new String[]{"TLSv1.3", "TLSv1.2"}); p.setSSLParameters(sp); }
        };
    }
}
