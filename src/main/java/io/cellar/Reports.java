package io.cellar;

import java.util.*;

public final class Reports {
    private Reports() {}
    public static String text(Map<String,Object> report) {
        if(!report.containsKey("results"))return Json.write(report)+"\n";
        StringBuilder b=new StringBuilder("Cellar Guard "+Main.VERSION+" | "+report.get("scope")+"\n");
        for(Object obj:(List<?>)report.get("results")) {
            Map<String,Object> r=Json.object(obj);String status=Boolean.TRUE.equals(r.get("passed"))?"PASS":r.get("severity").equals("warning")?"WARN":"FAIL";
            b.append(status).append("  ").append(r.get("integration")).append(" | owner: ").append(r.get("owner")).append('\n');
            for(Object issue:(List<?>)r.get("issues")) {
                Map<String,Object> i=Json.object(issue);
                b.append("  ").append(i.get("code")).append(" column=").append(i.get("column"))
                    .append(" record=").append(i.get("record")).append(" — ").append(i.get("message")).append('\n');
            }
            if(Boolean.TRUE.equals(r.get("truncated")))b.append("  Showing first 200 of ").append(r.get("issueCount")).append(" issues.\n");
        }
        b.append("Gate: ").append(Boolean.TRUE.equals(report.get("blocking"))?"BLOCK":"ALLOW").append(" | advisory=").append(report.get("advisory"))
            .append(" | rows checked=").append(report.get("rowsChecked")).append('\n');
        b.append("A pass covers only the declared contracts and this input fixture.\n");return b.toString();
    }
    private static String safe(Object value) {
        return value.toString().replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
            .replace("|","&#124;").replace("`","&#96;").replace("\r"," ").replace("\n"," ");
    }
    public static String markdown(Map<String,Object> report) {
        if(!report.containsKey("results")) return diffMarkdown(report);
        StringBuilder b=new StringBuilder("### Cellar compatibility report\n\n| Status | Integration | Owner | Issues |\n|---|---|---|---:|\n");
        for(Object obj:(List<?>)report.get("results")) {
            Map<String,Object> r=Json.object(obj);
            b.append("| ").append(Boolean.TRUE.equals(r.get("passed"))?"PASS":r.get("severity").equals("warning")?"WARN":"FAIL")
                .append(" | ").append(safe(r.get("integration"))).append(" | ").append(safe(r.get("owner"))).append(" | ").append(r.get("issueCount")).append(" |\n");
        }
        b.append("\nGate: **").append(Boolean.TRUE.equals(report.get("blocking"))?"BLOCK":"ALLOW").append("**. Scope: ").append(safe(report.get("scope"))).append(".\n\n");
        for(Object obj:(List<?>)report.get("results")) {
            Map<String,Object> r=Json.object(obj);
            for(Object issue:(List<?>)r.get("issues")) {
                Map<String,Object> i=Json.object(issue);b.append("- ").append(safe(r.get("integration"))).append(": ").append(i.get("code"))
                    .append("; column ").append(safe(i.get("column"))).append("; record ").append(i.get("record")).append(". ").append(safe(i.get("message"))).append('\n');
            }
            if(Boolean.TRUE.equals(r.get("truncated")))b.append("- Further issues omitted; total ").append(r.get("issueCount")).append(".\n");
        }
        return b.append("\nA pass covers only declared requirements and the supplied fixture. Cell values are omitted.\n").toString();
    }
    private static String diffMarkdown(Map<String,Object> report) {
        StringBuilder b = new StringBuilder("### Cellar export comparison\n\n");
        b.append("- Added columns: ").append(names((List<?>)report.get("added"))).append('\n');
        b.append("- Removed columns: ").append(names((List<?>)report.get("removed"))).append('\n');
        b.append("- Shared columns reordered: ").append(yesNo(report.get("reordered"))).append('\n');

        List<?> impacted = (List<?>)report.get("impacted");
        if(impacted.isEmpty()) {
            b.append("\nNo new header violations for the configured integrations.\n");
        } else {
            b.append("\n| Integration | Owner | Required columns removed | Disallowed additions | New order mismatch |\n")
                .append("|---|---|---|---|---|\n");
            for(Object item : impacted) {
                Map<String,Object> impact = Json.object(item);
                b.append("| ").append(safe(impact.get("integration")))
                    .append(" | ").append(safe(impact.get("owner")))
                    .append(" | ").append(names((List<?>)impact.get("removedRequired")))
                    .append(" | ").append(names((List<?>)impact.get("unexpectedAdded")))
                    .append(" | ").append(yesNo(impact.get("orderMismatch"))).append(" |\n");
            }
        }

        List<?> suggestions = (List<?>)report.get("renameCandidates");
        if(!suggestions.isEmpty()) {
            b.append("\nPossible renames based on header names:\n");
            for(Object item : suggestions) {
                Map<String,Object> suggestion = Json.object(item);
                b.append("- ").append(safe(suggestion.get("from"))).append(" → ")
                    .append(safe(suggestion.get("to"))).append(" (")
                    .append(suggestion.get("nameSimilarityPercent")).append("% name similarity)\n");
            }
        }
        return b.append("\nRun `check` on the proposed export for the release decision.\n").toString();
    }

    private static String names(List<?> names) {
        return names.isEmpty() ? "—" : String.join(", ", names.stream().map(Reports::safe).toList());
    }

    private static String yesNo(Object value) {
        return Boolean.TRUE.equals(value) ? "Yes" : "No";
    }

}
