package io.cellar.web;

import com.sun.net.httpserver.*;
import io.cellar.*;
import javax.net.ssl.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;

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
    record Route(boolean needsKey, int bodyLimit, Handler handler) {}
    private static final String ME = "you";
    static final class HttpError extends RuntimeException { final int status; HttpError(int status, String m) { super(m); this.status = status; } }
    static final class Ctx {
        HttpExchange x; String ip; Map<String, Object> body = Map.of();
    }

    private static final int SMALL = 64 * 1024, CONFIG = 1024 * 1024, CHECK = FilesEx.MAX_BYTES + 1024 * 1024, DIFF = 2 * FilesEx.MAX_BYTES + 1024 * 1024;
    private final WebConfig cfg; private final HttpServer server; private final ExecutorService executor;
    private final Workspace workspace; private final Audit audit;
    private final RateLimiter limiter = new RateLimiter(50_000);
    private final Semaphore checkPermits = new Semaphore(4), hashPermits = new Semaphore(4);
    private final Map<String, Route> routes = new HashMap<>(); private final Map<String, byte[]> statics = new HashMap<>(); private final Map<String, String> staticTypes = new HashMap<>();
    private final Set<String> allowedHosts = new HashSet<>(), allowedOrigins = new HashSet<>();
    

    public WebServer(WebConfig cfg) throws Exception {
        this.cfg = cfg;
        Crypto crypto = Crypto.load(cfg.masterKeyEnv(), cfg.dataDir().toAbsolutePath().resolve("master.key"));
        Vault vault = new Vault(cfg.dataDir(), crypto);
        workspace = new Workspace(vault); audit = new Audit(vault, crypto);

        InetSocketAddress addr = new InetSocketAddress(cfg.bindHost(), cfg.port());
        if (cfg.tls()) {
            HttpsServer https = HttpsServer.create(addr, 64); https.setHttpsConfigurator(tlsConfigurator(cfg)); server = https;
        } else server = HttpServer.create(addr, 64);
        int port = server.getAddress().getPort();
        if (cfg.publicOrigin() != null) {
            var o = cfg.publicOrigin(); String hp = o.getPort() == -1 ? o.getHost() : o.getHost() + ":" + o.getPort();
            allowedHosts.add(hp); allowedOrigins.add(o.getScheme() + "://" + hp);
        } else for (String h : List.of("127.0.0.1", "localhost")) { allowedHosts.add(h + ":" + port); allowedOrigins.add("http://" + h + ":" + port); }

        loadStatic("/", "index.html", "text/html; charset=utf-8"); loadStatic("/app.js", "app.js", "text/javascript; charset=utf-8");
        loadStatic("/app.css", "app.css", "text/css; charset=utf-8"); loadStatic("/logo.svg", "logo.svg", "image/svg+xml");
        registerRoutes();
        executor = Executors.newFixedThreadPool(16); server.setExecutor(executor); server.createContext("/", this::handle);
    }

    public void start() { server.start(); }
    public int port() { return server.getAddress().getPort(); }
    @Override public void close() { server.stop(0); executor.shutdownNow(); }

    // ------------------------------------------------------------------ routes
    private void registerRoutes() {
        route("GET", "/api/health", false, SMALL, c -> Json.map("status", "ok"));
        route("GET", "/api/session", false, SMALL, c -> Json.map("keyRequired", cfg.accessKey() != null, "version", Main.VERSION));
        route("GET", "/api/demo", true, SMALL, c -> Json.map("config", Json.parse(Demo.CONFIG), "csv", Demo.CSV, "brokenCsv", Demo.csv(true)));
        route("GET", "/api/config", true, SMALL, c -> workspace.config());
        route("PUT", "/api/config", true, CONFIG, this::saveConfig);
        route("GET", "/api/revisions", true, SMALL, c -> Json.map("revisions", workspace.revisions()));
        route("POST", "/api/check", true, CHECK, this::check);
        route("POST", "/api/diff", true, DIFF, this::diff);
        route("POST", "/api/scout", true, CHECK, c -> Agents.scout(str(c.body, "csv"), workspace.contract().delimiter()));
        route("GET", "/api/history", true, SMALL, c -> Json.map("history", workspace.history()));
        route("GET", "/api/activity", true, SMALL, c -> Json.map("entries", audit.recent(200)));
        route("GET", "/api/activity/verify", true, SMALL, c -> { var v = audit.verify(); return Json.map("ok", v.ok(), "entries", v.entries(), "head", v.head(), "problem", v.problem()); });
    }
    private void route(String method, String path, boolean needsKey, int limit, Handler h) { routes.put(method + " " + path, new Route(needsKey, limit, h)); }

    private Object saveConfig(Ctx c) {
        if (!c.body.containsKey("config")) throw new InputError("config is required.");
        var r = workspace.save(c.body.get("config"), str(c.body, "revision"), ME);
        audit.log(ME, c.ip, "CONFIG_SAVED", "revision " + ((String) r.get("revision")).substring(0, 12)); return r;
    }
    private Object check(Ctx c) throws Exception {
        if (c.body.containsKey("advisory") && !(c.body.get("advisory") instanceof Boolean)) throw new InputError("advisory must be boolean.");
        return guarded(() -> {
            var result = new LinkedHashMap<>(Checker.check(workspace.contract(), str(c.body, "csv"), Boolean.TRUE.equals(c.body.get("advisory"))));
            workspace.record(result, ME); result.put("agents", Agents.run(result));
            audit.log(ME, c.ip, "CHECK", "passed=" + result.get("passed") + " blocking=" + result.get("blocking") + " rows=" + result.get("rowsChecked"));
            return result;
        });
    }
    private Object diff(Ctx c) throws Exception {
        return guarded(() -> { var r = Checker.diff(workspace.contract(), str(c.body, "before"), str(c.body, "after")); audit.log(ME, c.ip, "DIFF", "added=" + ((List<?>) r.get("added")).size() + " removed=" + ((List<?>) r.get("removed")).size()); return r; });
    }

    // ------------------------------------------------------------------ pipeline
    private void handle(HttpExchange x) throws IOException {
        Ctx c = new Ctx(); c.x = x; String errorId = null;
        try {
            String path = x.getRequestURI().getRawPath(), method = x.getRequestMethod();
            String host = x.getRequestHeaders().getFirst("Host");
            if (host == null || !allowedHosts.contains(host.toLowerCase(Locale.ROOT))) throw new HttpError(400, "Unrecognised host.");      // DNS-rebinding defence
            c.ip = clientIp(x);
            if (!limiter.allow("ip:" + c.ip, 200, 120)) { x.getResponseHeaders().set("Retry-After", "30"); throw new HttpError(429, "Too many requests. Slow down."); }

            if (method.equals("GET") && statics.containsKey(path)) { sendBytes(x, 200, statics.get(path), staticTypes.get(path), "no-cache"); return; }
            Route route = routes.get(method + " " + path);
            if (route == null) {
                boolean known = routes.keySet().stream().anyMatch(k -> k.substring(k.indexOf(' ') + 1).equals(path)) || statics.containsKey(path);
                throw new HttpError(known ? 405 : 404, known ? "Method not allowed." : "Not found.");
            }
            boolean mutating = !method.equals("GET");
            if (mutating) {
                String origin = x.getRequestHeaders().getFirst("Origin");
                if (origin == null || !allowedOrigins.contains(origin)) throw new HttpError(403, "Cross-origin request rejected.");
                String site = x.getRequestHeaders().getFirst("Sec-Fetch-Site");
                if (site != null && !site.equals("same-origin")) throw new HttpError(403, "Cross-site request rejected.");
                String ct = x.getRequestHeaders().getFirst("Content-Type");
                if (ct == null || !ct.toLowerCase(Locale.ROOT).split(";", 2)[0].trim().equals("application/json")) throw new HttpError(415, "Use application/json.");
            }
            if (route.needsKey() && cfg.accessKey() != null) {
                limit("key:" + c.ip, 20, 30);
                if (!Crypto.equal(cfg.accessKey(), Objects.toString(x.getRequestHeaders().getFirst("X-Access-Key"), ""))) throw new HttpError(401, "Access key required.");
            }
            if (mutating) {
                byte[] bytes = x.getRequestBody().readNBytes(route.bodyLimit() + 1);
                if (bytes.length > route.bodyLimit()) throw new HttpError(413, "Request is too large.");
                c.body = Json.object(Json.parse(FilesEx.decode(bytes)));
            }
            Object result = route.handler().handle(c);
            sendJson(x, 200, result);
        } catch (HttpError e) { sendJson(x, e.status, Json.map("error", e.getMessage()));
        } catch (Workspace.Conflict e) { sendJson(x, 409, Json.map("error", e.getMessage()));
        } catch (InputError e) { sendJson(x, 400, Json.map("error", e.getMessage()));
        } catch (Throwable e) {
            errorId = Crypto.token(6); System.err.println("ERROR " + errorId + " " + e);                        // detail stays in the server log only
            sendJson(x, 500, Json.map("error", "Internal error. Reference " + errorId + "."));
        } finally { x.close(); }
    }

    // ------------------------------------------------------------------ helpers
    private void limit(String key, int burst, double perMinute) { if (!limiter.allow(key, burst, perMinute)) throw new HttpError(429, "Too many attempts. Wait a minute."); }
    private <T> T guarded(Callable<T> work) throws Exception {
        if (!checkPermits.tryAcquire()) throw new HttpError(503, "Too many checks running. Retry shortly.");
        try { return work.call(); } finally { checkPermits.release(); }
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
    private static HttpsConfigurator tlsConfigurator(WebConfig cfg) throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (InputStream in = new FileInputStream(cfg.tlsKeystore())) { ks.load(in, cfg.tlsPassword().toCharArray()); }
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm()); kmf.init(ks, cfg.tlsPassword().toCharArray());
        SSLContext ctx = SSLContext.getInstance("TLS"); ctx.init(kmf.getKeyManagers(), null, null);
        return new HttpsConfigurator(ctx) {
            @Override public void configure(HttpsParameters p) { SSLParameters sp = ctx.getDefaultSSLParameters(); sp.setProtocols(new String[]{"TLSv1.3", "TLSv1.2"}); p.setSSLParameters(sp); }
        };
    }
}
