package io.cellar;

import io.cellar.web.*;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.util.*;
import static io.cellar.AllTests.*;

/** Web-layer regression suite: open local mode, optional access key, origin checks, size limits and the agents. */
final class WebTests {
    static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);
    record Resp(int status, String body) {}

    static void run() throws Exception {
        Path root = Files.createTempDirectory("cellar-web-");
        try { units(); persistence(root); integration(root); aiTests(root); }
        finally { try (var f = Files.walk(root)) { for (Path p : f.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(p); } }
    }
    static void units() throws Exception {
        test("crypto round trip and tamper detection", () -> {
            Crypto c = new Crypto(Base64.getDecoder().decode(KEY)); byte[] blob = c.encrypt("p", "hello".getBytes());
            eq("hello", new String(c.decrypt("p", blob))); blob[blob.length - 1] ^= 1; invalid(() -> c.decrypt("p", blob));
        });
        test("triage agent spots a rename and blocks", () -> {
            var report = Checker.check(Contract.parse(Demo.CONFIG), Demo.csv(true), false); var agents = Agents.run(report);
            String text = Json.write(agents); ok(text.contains("renamed to `id`")); ok(text.contains("Block the release"));
        });
        test("triage agent reports safe to ship on a clean export", () -> ok(Json.write(Agents.run(Checker.check(Contract.parse(Demo.CONFIG), Demo.CSV, false))).contains("Safe to ship")));
        test("scout agent drafts a contract from a CSV", () -> {
            var draft = Agents.scout(Demo.CSV, ','); ok(Json.write(draft).contains("\"required\":[\"order_id\",\"sku\",\"total_cents\",\"currency\"]")); Contract.from(Json.map("integrations", List.of(draft)));
        });
        test("shared deployments require an HTTPS origin, proxy or TLS, and both keys", () -> {
            var env = new HashMap<>(Map.of("CELLAR_BIND", "0.0.0.0", "CELLAR_PUBLIC_URL", "https://C.example.com:443/",
                "CELLAR_ACCESS_KEY", "a-very-long-shared-access-key-24", "CELLAR_MASTER_KEY", KEY, "CELLAR_TRUST_PROXY", "true"));
            for (String name : List.of("CELLAR_ACCESS_KEY", "CELLAR_MASTER_KEY", "CELLAR_PUBLIC_URL", "CELLAR_TRUST_PROXY")) {
                String value = env.remove(name);
                invalid(() -> WebConfig.fromEnv(env, -1, null));
                env.put(name, value);
            }
            env.put("CELLAR_ACCESS_KEY", "short-key-12char");
            invalid(() -> WebConfig.fromEnv(env, -1, null));
            env.put("CELLAR_ACCESS_KEY", "a-very-long-shared-access-key-24");
            eq("https://c.example.com", WebConfig.fromEnv(env, -1, null).publicOrigin().toString());
            for (String url : List.of("http://c.example.com", "https://c.example.com/prefix", "https://c.example.com/?q=1")) {
                env.put("CELLAR_PUBLIC_URL", url);
                invalid(() -> WebConfig.fromEnv(env, -1, null));
            }
            invalid(() -> WebConfig.fromEnv(Map.of("CELLAR_TRUST_PROXY", "true"), -1, null));
        });
        test("separate frontend requires its own HTTPS origin and shared deployment keys", () -> {
            var env = new HashMap<>(Map.of("CELLAR_PUBLIC_URL", "https://api.example.com", "CELLAR_TRUST_PROXY", "true",
                "CELLAR_FRONTEND_ORIGIN", "https://CELLAR.example.com:443/", "CELLAR_ACCESS_KEY", "a-very-long-shared-access-key-24", "CELLAR_MASTER_KEY", KEY));
            eq("https://cellar.example.com", WebConfig.fromEnv(env, -1, null).frontendOrigin().toString());
            env.remove("CELLAR_ACCESS_KEY");
            invalid(() -> WebConfig.fromEnv(env, -1, null));
            env.put("CELLAR_ACCESS_KEY", "a-very-long-shared-access-key-24");
            for (String origin : List.of("http://cellar.example.com", "https://api.example.com", "https://cellar.example.com/demo")) {
                env.put("CELLAR_FRONTEND_ORIGIN", origin);
                invalid(() -> WebConfig.fromEnv(env, -1, null));
            }
        });
    }
    static void persistence(Path root) throws Exception {
        test("workspace lock prevents concurrent server writers and releases on close", () -> {
            var config = new WebConfig("127.0.0.1", 0, root.resolve("lock"), null, false, null, null, KEY, null);
            try (var first = new WebServer(config)) {
                first.start();
                try (var unexpected = new WebServer(config)) {
                    throw new AssertionError("More than one server acquired the workspace");
                } catch (InputError e) {
                    ok(e.getMessage().contains("Another Cellar server"));
                }
            }
            try (var reopened = new WebServer(config)) {
                reopened.start();
                eq(200, send("GET", "http://127.0.0.1:" + reopened.port() + "/api/ready", null, null, null).status());
            }
        });
        test("failed contract write leaves the current contract and revisions intact", () -> {
            Path data = root.resolve("failed-write");
            var vault = new Vault(data, new Crypto(Base64.getDecoder().decode(KEY)));
            var workspace = new Workspace(vault);
            var previous = workspace.config();
            var revisions = workspace.revisions();
            var edit = Json.object(previous.get("config"));
            edit.put("delimiter", ";");
            Path stored = data.resolve("workspace.enc");
            Path backup = data.resolve("saved.enc");
            Files.move(stored, backup);
            Files.createDirectory(stored);
            Files.writeString(stored.resolve("keep"), "fixture");
            invalid(() -> workspace.save(edit, (String) previous.get("revision"), "test"));
            eq(previous.get("revision"), workspace.config().get("revision"));
            eq(revisions, workspace.revisions());
            Files.delete(stored.resolve("keep"));
            Files.delete(stored);
            Files.move(backup, stored);
            eq(previous.get("revision"), new Workspace(vault).config().get("revision"));
        });
        test("existing history and passing baseline survive the first new check", () -> {
            var vault = new Vault(root.resolve("legacy-history"), new Crypto(Base64.getDecoder().decode(KEY)));
            var legacyHeader = List.of("legacy_column");
            vault.write("baseline.enc", Json.map("header", legacyHeader));
            vault.write("history.enc", Json.map("history", List.of(Json.map("id", "legacy-run"))));
            var workspace = new Workspace(vault);
            var contract = workspace.contract();
            var report = Checker.check(contract, Demo.CSV, false);
            eq(legacyHeader, workspace.record(report, "test"));
            // A failed CSV check keeps the last passing header after a server restart.
            var reopened = new Workspace(vault);
            eq(report.get("header"), reopened.record(Checker.check(contract, Demo.csv(true), false), "test"));
            eq("legacy-run", Json.object(reopened.history().get(2)).get("id"));
        });
    }
    static void integration(Path root) throws Exception {
        try (var s = new WebServer(new WebConfig("127.0.0.1", 0, root.resolve("open"), null, false, null, null, KEY, null))) {
            s.start(); String base = "http://127.0.0.1:" + s.port();
            test("no login needed locally", () -> eq(200, send("GET", base + "/api/config", null, null, base).status()));
            test("diff accepts a JSON envelope larger than a single CSV limit", () -> {
                String rows = "a,b,c,d\n" + "x".repeat(62) + "\n";
                String before = "order_id,sku,total_cents,currency\n" + rows.repeat(65_000);
                String after = "id,sku,total_cents,currency\n" + rows.repeat(65_000);
                Resp result = send("POST", base + "/api/diff", Json.write(Json.map("before", before, "after", after)), null, base);
                eq(200, result.status());
                ok(result.body().contains("inventory-report"));
            });
            test("check returns agents and records history", () -> {
                Resp r = send("POST", base + "/api/check", "{\"csv\":\"id,sku,total_cents,currency\\nA,B,1,INR\\n\"}", null, base);
                eq(200, r.status()); ok(r.body().contains("\"agents\"")); ok(send("GET", base + "/api/history", null, null, base).body().contains("inventory-report"));
            });
            test("scout and activity routes work", () -> { eq(200, send("POST", base + "/api/scout", "{\"csv\":\"a,b\\n1,x\\n\"}", null, base).status()); ok(send("GET", base + "/api/activity", null, null, base).body().contains("CHECK")); });
            test("contract edits can be restored", () -> {
                String first = Json.object(Json.parse(send("GET", base + "/api/config", null, null, base).body())).get("revision").toString();
                var cfg = Json.object(Json.parse(send("GET", base + "/api/config", null, null, base).body())); var conf = Json.object(cfg.get("config")); conf.put("delimiter", ";");
                eq(200, send("PUT", base + "/api/config", "{\"config\":" + Json.write(conf) + ",\"revision\":\"" + first + "\"}", null, base).status());
                ok(send("POST", base + "/api/restore", "{\"hash\":\"" + first + "\"}", null, base).body().contains("inventory-report"));
                ok(!send("GET", base + "/api/config", null, null, base).body().contains("\";\""));
            });
            test("stats route reports runs", () -> ok(send("GET", base + "/api/stats", null, null, base).body().contains("\"runs\"")));
            test("drift agent flags a new column after a passing run", () -> {
                send("POST", base + "/api/check", "{\"csv\":\"order_id,sku,total_cents,currency\\nA,B,1,INR\\n\"}", null, base);
                ok(send("POST", base + "/api/check", "{\"csv\":\"order_id,sku,total_cents,currency,note\\nA,B,1,INR,x\\n\"}", null, base).body().contains("New column `note`"));
            });
            test("inbox agent checks dropped files automatically", () -> {
                Files.writeString(root.resolve("open/inbox/drop.csv"), "id,sku,total_cents,currency\nA,B,1,INR\n"); String body = "";
                for (int i = 0; i < 20 && !body.contains("drop.csv"); i++) { Thread.sleep(500); body = send("GET", base + "/api/live", null, null, base).body(); }
                ok(body.contains("drop.csv")); ok(body.contains("inventory-report"));
            });
            test("cross-origin and wrong-host posts are rejected", () -> {
                eq(403, send("POST", base + "/api/check", "{\"csv\":\"a\\n1\"}", null, "http://evil.example").status());
                eq(403, send("POST", base + "/api/check", "{\"csv\":\"a\\n1\"}", null, null).status());
            });
            test("oversize bodies are rejected", () -> { try { eq(413, send("PUT", base + "/api/config", "{\"config\":\"" + "a".repeat(2 * 1024 * 1024) + "\"}", null, base).status()); } catch (java.io.IOException reset) { /* server closed early: also a rejection */ } });
            test("stale contract revision conflicts", () -> eq(409, send("PUT", base + "/api/config", "{\"config\":" + Json.write(Json.parse(Demo.CONFIG)) + ",\"revision\":\"stale\"}", null, base).status()));
        }
        try (var s = new WebServer(new WebConfig("127.0.0.1", 0, root.resolve("keyed"), null, false, null, null, KEY, "a-very-long-shared-access-key-24"))) {
            s.start(); String base = "http://127.0.0.1:" + s.port();
            test("access key gates the api when configured", () -> {
                eq(401, send("GET", base + "/api/config", null, null, base).status()); eq(401, send("GET", base + "/api/config", null, "wrong", base).status());
                eq(200, send("GET", base + "/api/config", null, "a-very-long-shared-access-key-24", base).status()); eq(200, send("GET", base + "/api/health", null, null, base).status());
            });
            test("failed access keys are throttled without blocking authenticated requests", () -> {
                for (int i = 0; i < 20; i++) send("GET", base + "/api/config", null, "wrong", base);
                eq(429, send("GET", base + "/api/config", null, "wrong", base).status());
                eq(200, send("GET", base + "/api/config", null, "a-very-long-shared-access-key-24", base).status());
            });
            test("failed authentication logs AUTH_FAILED and AUTH_FLOOD without locking valid users", () -> {
                for (int i = 0; i < 35; i++) send("GET", base + "/api/config", null, "wrong", base);
                eq(200, send("GET", base + "/api/config", null, "a-very-long-shared-access-key-24", base).status());
                Resp act = send("GET", base + "/api/activity", null, "a-very-long-shared-access-key-24", base);
                eq(200, act.status());
                ok(act.body().contains("AUTH_FAILED"));
                ok(act.body().contains("AUTH_FLOOD"));
                Resp ver = send("GET", base + "/api/activity/verify", null, "a-very-long-shared-access-key-24", base);
                eq(200, ver.status());
                ok(ver.body().contains("\"ok\":true"));
            });
        }
    }
    static void aiTests(Path root) throws Exception {
        var seen = new java.util.concurrent.atomic.AtomicReference<String>("");
        var oversized = new java.util.concurrent.atomic.AtomicBoolean();
        var upstreamStatus = new java.util.concurrent.atomic.AtomicInteger(200);
        var stub = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        stub.createContext("/", ex -> {
            seen.set(new String(ex.getRequestBody().readAllBytes()));
            String body = oversized.get()
                ? "{\"content\":[{\"type\":\"text\",\"text\":\"" + "x".repeat(1_048_600) + "\"}]}"
                : "{\"content\":[{\"type\":\"text\",\"text\":\"Plain answer\"}]}";
            byte[] out = body.getBytes(); ex.sendResponseHeaders(upstreamStatus.get(), out.length); ex.getResponseBody().write(out); ex.close();
        });
        stub.start();
        try (var s = new WebServer(new WebConfig("127.0.0.1", 0, root.resolve("ai"), null, false, null, null, KEY, null), new Ai("anthropic", "k", "m", "http://127.0.0.1:" + stub.getAddress().getPort() + "/v1/messages"))) {
            s.start(); String base = "http://127.0.0.1:" + s.port();
            test("ai agent answers and never receives cell values", () -> {
                String report = send("POST", base + "/api/check", "{\"csv\":\"id,sku,total_cents,currency\\nSECRET-ZZZ,B,1,INR\\n\"}", null, base).body();
                Resp r = send("POST", base + "/api/ai", "{\"task\":\"explain\",\"report\":" + report + "}", null, base);
                eq(200, r.status()); ok(r.body().contains("Plain answer")); ok(seen.get().contains("inventory-report")); ok(!seen.get().contains("SECRET-ZZZ"));
            });
            test("AI upstream errors and oversized responses use bounded gateway errors", () -> {
                upstreamStatus.set(429);
                eq(503, send("POST", base + "/api/ai", "{\"task\":\"explain\"}", null, base).status());
                upstreamStatus.set(200); oversized.set(true);
                eq(502, send("POST", base + "/api/ai", "{\"task\":\"explain\"}", null, base).status());
                oversized.set(false);
            });
            test("ai rejects unknown tasks and long questions", () -> { eq(400, send("POST", base + "/api/ai", "{\"task\":\"hack\"}", null, base).status()); eq(400, send("POST", base + "/api/ai", "{\"task\":\"ask\",\"question\":\"" + "q".repeat(600) + "\"}", null, base).status()); });
        } finally { stub.stop(0); }
        try (var s = new WebServer(new WebConfig("127.0.0.1", 0, root.resolve("noai"), null, false, null, null, KEY, null), new Ai("anthropic", null, "m", "https://x"))) {
            s.start(); String base = "http://127.0.0.1:" + s.port();
            test("ai is off without a key", () -> { eq(400, send("POST", base + "/api/ai", "{\"task\":\"explain\"}", null, base).status()); ok(send("GET", base + "/api/session", null, null, base).body().contains("\"ai\":false")); });
        }
    }
    static Resp send(String method, String url, String body, String key, String origin) throws Exception {
        var b = HttpRequest.newBuilder(URI.create(url)); if (origin != null) b.header("Origin", origin); if (key != null) b.header("X-Access-Key", key);
        if (body != null) b.header("Content-Type", "application/json");
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        var r = HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString()); return new Resp(r.statusCode(), r.body());
    }
}
