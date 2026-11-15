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
        try { units(); integration(root); }
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
        test("network exposure needs an access key", () -> {
            invalid(() -> WebConfig.fromEnv(Map.of("CELLAR_BIND", "0.0.0.0", "CELLAR_PUBLIC_URL", "https://c.example.com"), -1, null));
            WebConfig.fromEnv(Map.of("CELLAR_BIND", "0.0.0.0", "CELLAR_PUBLIC_URL", "https://c.example.com", "CELLAR_ACCESS_KEY", "a-long-shared-key"), -1, null);
        });
    }
    static void integration(Path root) throws Exception {
        try (var s = new WebServer(new WebConfig("127.0.0.1", 0, root.resolve("open"), null, false, null, null, KEY, null))) {
            s.start(); String base = "http://127.0.0.1:" + s.port();
            test("no login needed locally", () -> eq(200, send("GET", base + "/api/config", null, null, base).status()));
            test("check returns agents and records history", () -> {
                Resp r = send("POST", base + "/api/check", "{\"csv\":\"id,sku,total_cents,currency\\nA,B,1,INR\\n\"}", null, base);
                eq(200, r.status()); ok(r.body().contains("\"agents\"")); ok(send("GET", base + "/api/history", null, null, base).body().contains("inventory-report"));
            });
            test("scout and activity routes work", () -> { eq(200, send("POST", base + "/api/scout", "{\"csv\":\"a,b\\n1,x\\n\"}", null, base).status()); ok(send("GET", base + "/api/activity", null, null, base).body().contains("CHECK")); });
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
            test("oversize bodies are rejected", () -> eq(413, send("PUT", base + "/api/config", "{\"config\":\"" + "a".repeat(2 * 1024 * 1024) + "\"}", null, base).status()));
            test("stale contract revision conflicts", () -> eq(409, send("PUT", base + "/api/config", "{\"config\":" + Json.write(Json.parse(Demo.CONFIG)) + ",\"revision\":\"stale\"}", null, base).status()));
        }
        try (var s = new WebServer(new WebConfig("127.0.0.1", 0, root.resolve("keyed"), null, false, null, null, KEY, "a-long-shared-key"))) {
            s.start(); String base = "http://127.0.0.1:" + s.port();
            test("access key gates the api when configured", () -> {
                eq(401, send("GET", base + "/api/config", null, null, base).status()); eq(401, send("GET", base + "/api/config", null, "wrong", base).status());
                eq(200, send("GET", base + "/api/config", null, "a-long-shared-key", base).status()); eq(200, send("GET", base + "/api/health", null, null, base).status());
            });
        }
    }
    static Resp send(String method, String url, String body, String key, String origin) throws Exception {
        var b = HttpRequest.newBuilder(URI.create(url)); if (origin != null) b.header("Origin", origin); if (key != null) b.header("X-Access-Key", key);
        if (body != null) b.header("Content-Type", "application/json");
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        var r = HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString()); return new Resp(r.statusCode(), r.body());
    }
}
