package io.cellar.web;

import io.cellar.*;
import java.time.Instant;
import java.util.*;

/** The one shared contract plus bounded check history, stored encrypted, with optimistic revision control. */
public final class Workspace {
    public static final class Conflict extends RuntimeException { public Conflict() { super("The contract changed since you loaded it. Reload before saving."); } }
    private static final int MAX_CONTRACT_CHARS = 512 * 1024, MAX_REVISIONS = 50, MAX_HISTORY = 100;
    private static final int MAX_REVISION_CHARS = 4 * 1024 * 1024;
    private final Vault vault;
    private String contractText;
    private List<Object> revisions;

    public Workspace(Vault vault) {
        this.vault = vault;
        Map<String, Object> saved = vault.read("workspace.enc");
        Map<String, Object> runs = vault.read("history.enc");
        if (runs != null) Json.array(runs.get("history"));
        readBaseline(runs); // Check existing files before the server can accept traffic.
        if (saved == null) {
            contractText = Json.write(Json.parse(Demo.CONFIG)); Contract.parse(contractText);
            revisions = List.of(rev(contractText, "system"));
            persistContract(contractText, revisions);
        } else {
            contractText = (String) saved.get("contract");
            Contract.parse(contractText);
            revisions = Json.array(saved.get("revisions"));
        }
    }

    public synchronized Contract contract() { return Contract.parse(contractText); }
    public synchronized Map<String, Object> config() { return Json.map("config", Json.parse(contractText), "revision", FilesEx.hash(contractText)); }
    public synchronized List<Object> revisions() {
        List<Object> r = new ArrayList<>(); for (Object o : revisions) { Map<String, Object> m = new LinkedHashMap<>(Json.object(o)); m.put("restorable", m.remove("text") instanceof String); r.add(m); }
        Collections.reverse(r); return r;
    }
    /** Roll back to an earlier saved contract. The rollback is itself a new revision, so nothing is ever lost. */
    public synchronized Map<String, Object> restore(String hash, String actor) {
        for (Object o : revisions) { Map<String, Object> m = Json.object(o); if (Crypto.equal(String.valueOf(m.get("hash")), hash) && m.get("text") instanceof String t) return save(Json.parse(t), FilesEx.hash(contractText), actor); }
        throw new InputError("That revision cannot be restored (it was saved before restore was available).");
    }

    public synchronized Map<String, Object> save(Object config, String expectedRevision, String actor) {
        String text = Json.write(config);
        if (text.length() > MAX_CONTRACT_CHARS) throw new InputError("Contract is too large.");
        Contract.parse(text);                                           // validate BEFORE touching state
        if (expectedRevision == null || !Crypto.equal(FilesEx.hash(contractText), expectedRevision)) throw new Conflict();
        if (text.equals(contractText)) return config();
        List<Object> next = new ArrayList<>(revisions);
        next.add(rev(text, actor));
        int first = next.size() - 1;
        int size = text.length();
        while (first > 0 && next.size() - first < MAX_REVISIONS) {
            Object oldText = Json.object(next.get(first - 1)).get("text");
            if (oldText instanceof String revisionText) size += revisionText.length();
            if (size > MAX_REVISION_CHARS) break;
            first--;
        }
        next = new ArrayList<>(next.subList(first, next.size()));
        persistContract(text, next);
        contractText = text;
        revisions = next;
        return config();
    }

    /** Atomically persist the result and latest passing header, returning the prior header for drift analysis. */
    public synchronized List<?> record(Map<String, Object> report, String actor) {
        Map<String, Object> d = vault.read("history.enc"); List<Object> history = d == null ? new ArrayList<>() : new ArrayList<>((List<?>) d.get("history"));
        List<?> previousHeader = readBaseline(d);
        List<?> nextHeader = Boolean.TRUE.equals(report.get("passed")) ? (List<?>) report.get("header") : previousHeader;
        List<Object> summary = new ArrayList<>();
        for (Object obj : (List<?>) report.get("results")) {
            Map<String, Object> r = Json.object(obj);
            summary.add(Json.map("integration", r.get("integration"), "passed", r.get("passed"), "severity", r.get("severity"), "issueCount", r.get("issueCount")));
        }
        history.add(0, Json.map("id", UUID.randomUUID().toString(), "timestamp", Instant.now().toString(), "actor", actor, "passed", report.get("passed"),
            "blocking", report.get("blocking"), "scope", report.get("scope"), "advisory", report.get("advisory"), "rowsChecked", report.get("rowsChecked"),
            "contractHash", report.get("contractHash"), "results", summary));
        vault.write("history.enc", Json.map("history", history.subList(0, Math.min(MAX_HISTORY, history.size())), "header", nextHeader));
        return previousHeader;
    }
    public synchronized List<Object> history() { Map<String, Object> d = vault.read("history.enc"); return d == null ? new ArrayList<>() : new ArrayList<>((List<?>) d.get("history")); }

    private List<?> readBaseline(Map<String, Object> history) {
        if (history != null && history.containsKey("header")) {
            Object header = history.get("header");
            return header == null ? null : Json.array(header);
        }
        Map<String, Object> legacy = vault.read("baseline.enc");
        return legacy == null ? null : Json.array(legacy.get("header"));
    }

    private static Map<String, Object> rev(String text, String actor) {
        return Json.map("hash", FilesEx.hash(text), "actor", actor, "at", Instant.now().toString(), "text", text);
    }

    private void persistContract(String text, List<Object> savedRevisions) {
        vault.write("workspace.enc", Json.map("contract", text, "revisions", savedRevisions));
    }
}
