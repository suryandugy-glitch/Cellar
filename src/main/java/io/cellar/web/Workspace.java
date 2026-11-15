package io.cellar.web;

import io.cellar.*;
import java.time.Instant;
import java.util.*;

/** The one shared contract plus bounded check history, stored encrypted, with optimistic revision control. */
public final class Workspace {
    public static final class Conflict extends RuntimeException { public Conflict() { super("The contract changed since you loaded it. Reload before saving."); } }
    private static final int MAX_CONTRACT_CHARS = 512 * 1024, MAX_REVISIONS = 50, MAX_HISTORY = 100;
    private final Vault vault;
    private String contractText; private final List<Object> revisions = new ArrayList<>();

    public Workspace(Vault vault) {
        this.vault = vault;
        Map<String, Object> d = vault.read("workspace.enc");
        if (d == null) {
            contractText = Json.write(Json.parse(Demo.CONFIG)); Contract.parse(contractText);
            revisions.add(rev("system")); persistContract();
        } else { contractText = (String) d.get("contract"); revisions.addAll((List<?>) d.get("revisions")); Contract.parse(contractText); }
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
        contractText = text; revisions.add(rev(actor));
        while (revisions.size() > MAX_REVISIONS) revisions.remove(0);
        persistContract(); return config();
    }

    public synchronized void record(Map<String, Object> report, String actor) {
        Map<String, Object> d = vault.read("history.enc"); List<Object> history = d == null ? new ArrayList<>() : new ArrayList<>((List<?>) d.get("history"));
        List<Object> summary = new ArrayList<>();
        for (Object obj : (List<?>) report.get("results")) {
            Map<String, Object> r = Json.object(obj);
            summary.add(Json.map("integration", r.get("integration"), "passed", r.get("passed"), "severity", r.get("severity"), "issueCount", r.get("issueCount")));
        }
        history.add(0, Json.map("id", UUID.randomUUID().toString(), "timestamp", Instant.now().toString(), "actor", actor, "passed", report.get("passed"),
            "blocking", report.get("blocking"), "scope", report.get("scope"), "advisory", report.get("advisory"), "rowsChecked", report.get("rowsChecked"),
            "contractHash", report.get("contractHash"), "results", summary));
        vault.write("history.enc", Json.map("history", history.subList(0, Math.min(MAX_HISTORY, history.size()))));
    }
    public synchronized List<Object> history() { Map<String, Object> d = vault.read("history.enc"); return d == null ? new ArrayList<>() : new ArrayList<>((List<?>) d.get("history")); }

    public synchronized List<?> baseline() { Map<String, Object> d = vault.read("baseline.enc"); return d == null ? null : (List<?>) d.get("header"); }
    public synchronized void setBaseline(List<?> header) { vault.write("baseline.enc", Json.map("header", header)); }
    private Map<String, Object> rev(String actor) { return Json.map("hash", FilesEx.hash(contractText), "actor", actor, "at", Instant.now().toString(), "text", contractText); }
    private void persistContract() { vault.write("workspace.enc", Json.map("contract", contractText, "revisions", revisions)); }
}
