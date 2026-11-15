package io.cellar.web;

import io.cellar.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

/**
 * Append-only, tamper-evident audit trail. Every entry carries an HMAC over its content AND the previous entry's HMAC,
 * so editing, deleting or reordering any line breaks every line after it. The key is derived from the master key,
 * so an attacker who only reaches the data directory cannot forge a valid chain.
 * Never log passwords, tokens, CSV cells. Truncating the tail is detectable only against an externally stored head — see verify().
 */
public final class Audit {
    public record Verdict(boolean ok, int entries, String head, String problem) {}
    private final Path file; private final Crypto crypto;
    private long seq; private String head = "0".repeat(64);

    public Audit(Vault vault, Crypto crypto) {
        this.file = vault.dir().resolve("audit.log"); this.crypto = crypto;
        Verdict v = verify();
        if (!v.ok()) throw new InputError("Audit log failed verification (" + v.problem() + "). Refusing to start; investigate possible tampering.");
        seq = v.entries(); head = v.head();
    }

    public synchronized void log(String actor, String ip, String action, String detail) {
        long n = seq + 1; String ts = Instant.now().toString();
        String a = clean(actor, 64), i = clean(ip, 64), act = clean(action, 40), d = clean(detail, 300);
        String mac = mac(head, n, ts, a, i, act, d);
        String line = Json.write(Json.map("seq", n, "ts", ts, "actor", a, "ip", i, "action", act, "detail", d, "prev", head, "mac", mac)) + "\n";
        try { Files.writeString(file, line, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND, StandardOpenOption.SYNC); }
        catch (IOException e) { throw new InputError("Audit log is not writable; refusing the operation."); }   // fail closed
        seq = n; head = mac;
    }

    public synchronized List<Object> recent(int limit) {
        List<Object> all = readAll(); int from = Math.max(0, all.size() - limit);
        List<Object> out = new ArrayList<>(all.subList(from, all.size())); Collections.reverse(out);
        for (Object o : out) Json.object(o).remove("prev");
        return out;
    }

    public synchronized Verdict verify() {
        if (!Files.exists(file)) return new Verdict(true, 0, "0".repeat(64), "");
        String prev = "0".repeat(64); int n = 0;
        try {
            for (Object o : readAll()) {
                Map<String, Object> m = Json.object(o);
                n++;
                if (((Number) m.get("seq")).longValue() != n) return new Verdict(false, n, prev, "sequence gap at entry " + n);
                if (!Crypto.equal((String) m.get("prev"), prev)) return new Verdict(false, n, prev, "chain broken at entry " + n);
                String expected = mac(prev, n, (String) m.get("ts"), (String) m.get("actor"), (String) m.get("ip"), (String) m.get("action"), (String) m.get("detail"));
                if (!Crypto.equal(expected, (String) m.get("mac"))) return new Verdict(false, n, prev, "entry " + n + " was modified");
                prev = expected;
            }
        } catch (RuntimeException e) { return new Verdict(false, n, prev, "unreadable entry after " + n); }
        return new Verdict(true, n, prev, "");
    }

    private List<Object> readAll() {
        if (!Files.exists(file)) return new ArrayList<>();
        try {
            List<Object> out = new ArrayList<>();
            for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) if (!line.isBlank()) out.add(Json.parse(line));
            return out;
        } catch (IOException e) { throw new InputError("Cannot read the audit log."); }
    }
    private String mac(String prev, long n, String ts, String actor, String ip, String action, String detail) {
        return crypto.hmac("audit", String.join("\u001f", prev, Long.toString(n), ts, actor, ip, action, detail));
    }
    private static String clean(String s, int max) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) { if (c < 32 || c == 127) c = ' '; b.append(c); if (b.length() >= max) break; }
        return b.toString();
    }
}
