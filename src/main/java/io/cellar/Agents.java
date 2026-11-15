package io.cellar;

import java.math.BigDecimal;
import java.util.*;

/** Offline, deterministic agents. No network, no model: they run automatically on every check and never see cell values in reports. */
public final class Agents {
    private Agents() {}

    /** Triage + release-gate + reporter agents, run on every check. */
    public static List<Object> run(Map<String, Object> report) { return run(report, null); }
    public static List<Object> run(Map<String, Object> report, List<?> baseline) {
        List<?> header = (List<?>) report.get("header"); Set<String> claimed = new HashSet<>(); List<Object> failing = new ArrayList<>();
        for (Object o : (List<?>) report.get("results")) { Map<String, Object> r = Json.object(o); if (!Boolean.TRUE.equals(r.get("passed"))) failing.add(r); }
        List<Object> triage = new ArrayList<>(); StringBuilder md = new StringBuilder("### Cellar check\n\n");
        for (Object f : failing) {
            Map<String, Object> r = Json.object(f);
            for (Object m : (List<?>) r.get("missing")) {
                String col = (String) m, best = null; double score = 0;
                for (Object c : header) { String cand = (String) c; if (claimed.contains(cand)) continue; double s = similarity(col, cand); if (s > score) { score = s; best = cand; } }
                if (best != null && score >= 0.5) {
                    claimed.add(best);
                    triage.add(Json.map("title", r.get("integration") + " lost `" + col + "`", "detail", "Likely renamed to `" + best + "` (" + Math.round(score * 100) + "% name match).",
                        "action", "Keep both `" + col + "` and `" + best + "` until " + r.get("owner") + " migrates, then update the contract."));
                    md.append("- **FAIL** ").append(r.get("integration")).append(": `").append(col).append("` looks renamed to `").append(best).append("`\n");
                } else {
                    triage.add(Json.map("title", r.get("integration") + " lost `" + col + "`", "detail", "No similar new column found: it looks removed.", "action", "Restore the column or ask " + r.get("owner") + " to migrate first."));
                    md.append("- **FAIL** ").append(r.get("integration")).append(": `").append(col).append("` removed\n");
                }
            }
            if (((List<?>) r.get("missing")).isEmpty()) { triage.add(Json.map("title", r.get("integration") + " has " + r.get("issueCount") + " rule findings", "detail", "Header is fine; value rules failed.", "action", "See the findings table for codes and record numbers.")); md.append("- **FAIL** ").append(r.get("integration")).append(": value rules\n"); }
        }
        if (failing.isEmpty()) md.append("All integrations satisfy their declared requirements.\n");
        boolean blocked = Boolean.TRUE.equals(report.get("blocking"));
        String verdict = blocked ? "Block the release" : failing.isEmpty() ? "Safe to ship" : "Ship with warnings";
        List<Object> drift = new ArrayList<>();
        if (baseline != null && !baseline.equals(header)) {
            for (Object c : header) if (!baseline.contains(c)) drift.add(Json.map("title", "New column `" + c + "`", "detail", "Not in the last passing export.", "action", "Safe for readers that look columns up by name."));
            for (Object c : baseline) if (!header.contains(c)) drift.add(Json.map("title", "Column `" + c + "` disappeared", "detail", "It was in the last passing export.", "action", "Check who reads it before shipping."));
            if (drift.isEmpty()) drift.add(Json.map("title", "Columns were reordered", "detail", "Same columns, different order.", "action", "Only matters to readers that use column positions."));
        }
        return List.of(
            Json.map("agent", "Drift watch", "findings", drift.isEmpty() ? List.of(Json.map("title", baseline == null ? "No baseline yet" : "No drift", "detail", baseline == null ? "A passing check sets the baseline." : "Columns match the last passing export.", "action", "")) : drift),
            Json.map("agent", "Triage", "findings", triage),
            Json.map("agent", "Release gate", "findings", List.of(Json.map("title", verdict, "detail", failing.size() + " of " + ((List<?>) report.get("results")).size() + " integrations need attention.", "action", blocked ? "Fix or migrate before merging." : "No action required."))),
            Json.map("agent", "Reporter", "markdown", md.toString(), "findings", List.of()));
    }

    /** Scout agent: drafts a contract integration from a sample CSV. */
    public static Map<String, Object> scout(String csv, char delimiter) {
        Csv.Table t = Csv.parse(csv, delimiter, true); Map<String, Object> rules = new LinkedHashMap<>(); int n = t.rows().size();
        for (int i = 0; i < t.header().size(); i++) {
            List<String> vals = new ArrayList<>(); boolean empty = false;
            for (List<String> row : t.rows()) { String v = row.get(i); if (v.isEmpty()) empty = true; else vals.add(v); }
            String type = "string";
            for (String candidate : List.of("integer", "decimal", "boolean", "date", "datetime")) if (!vals.isEmpty() && vals.stream().allMatch(v -> Checker.validType(v, candidate))) { type = candidate; break; }
            Map<String, Object> rule = new LinkedHashMap<>(); if (!type.equals("string")) rule.put("type", type);
            if (!empty && n > 0) rule.put("notEmpty", true);
            Set<String> distinct = new HashSet<>(vals); if (n >= 2 && distinct.size() == n && !empty && (type.equals("string") || type.equals("integer"))) rule.put("unique", true);
            if (type.equals("string") && n >= 6 && distinct.size() <= 4) rule.put("enum", new ArrayList<>(new TreeSet<>(distinct)));
            if (type.equals("integer") && vals.stream().allMatch(v -> !v.startsWith("-"))) rule.put("min", BigDecimal.ZERO);
            if (!rule.isEmpty()) rules.put(t.header().get(i), rule);
        }
        return Json.map("id", "new-integration", "owner", "Unassigned", "description", "Drafted by the Scout agent from a sample export", "required", t.header(), "rules", rules, "minRows", BigDecimal.valueOf(n > 0 ? 1 : 0));
    }

    static double similarity(String a, String b) {
        String x = a.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", ""), y = b.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        if (x.isEmpty() || y.isEmpty()) return 0; if (x.equals(y)) return 1; if (x.contains(y) || y.contains(x)) return 0.8;
        int[] prev = new int[y.length() + 1], cur = new int[y.length() + 1]; for (int j = 0; j <= y.length(); j++) prev[j] = j;
        for (int i = 1; i <= x.length(); i++) { cur[0] = i; for (int j = 1; j <= y.length(); j++) cur[j] = Math.min(Math.min(cur[j - 1], prev[j]) + 1, prev[j - 1] + (x.charAt(i - 1) == y.charAt(j - 1) ? 0 : 1)); int[] s = prev; prev = cur; cur = s; }
        return 1.0 - (double) prev[y.length()] / Math.max(x.length(), y.length());
    }
}
