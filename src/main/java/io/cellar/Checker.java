package io.cellar;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Pure check engine shared by CLI, desktop, and HTTP. Reports never contain CSV cell values. */
public final class Checker {
    private Checker() {}
    public static Map<String,Object> check(Contract contract,String csv,boolean advisory) {
        boolean rows=contract.checksRows();Csv.Table table=Csv.parse(csv,contract.delimiter(),rows);
        List<Object> results=new ArrayList<>();boolean passed=true;int errors=0,warnings=0;
        Map<String,Integer> positions=new HashMap<>();for(int i=0;i<table.header().size();i++)positions.put(table.header().get(i),i);
        for(Contract.Integration integration:contract.integrations()) {
            Issues issues=new Issues(); List<String> missing=new ArrayList<>();
            for(String column:integration.required())if(!positions.containsKey(column)) {
                missing.add(column);issues.add("MISSING_COLUMN",column,1,"Restore this column or coordinate the consumer migration.");
            }
            if(!integration.allowed().isEmpty())for(String column:table.header())if(!integration.allowed().contains(column))
                issues.add("UNEXPECTED_COLUMN",column,1,"Remove the extra column or update the allowed list after owner review.");
            if(!integration.order().isEmpty()&&!integration.order().equals(table.header()))
                issues.add("COLUMN_ORDER","",1,"Header must exactly match the declared order, including all columns.");
            if(integration.minRows()!=null && table.rows().size()<integration.minRows())issues.add("MIN_ROWS","",0,"Export contains fewer records than minRows.");
            if(integration.maxRows()!=null && table.rows().size()>integration.maxRows())issues.add("MAX_ROWS","",0,"Export contains more records than maxRows.");
            for(var ruleEntry:integration.rules().entrySet()) {
                String column=ruleEntry.getKey();Integer index=positions.get(column);if(index==null)continue;
                Contract.Rule rule=ruleEntry.getValue();Set<String> seen=rule.unique()?new HashSet<>():null;
                int row=1;
                for(List<String> cells:table.rows()) {
                    row++;String value=cells.get(index);
                    if(value.isEmpty()) {if(rule.notEmpty())issues.add("EMPTY_VALUE",column,row,"Supply a nonempty value.");continue;}
                    if(seen!=null&&!seen.add(value))issues.add("DUPLICATE_VALUE",column,row,"Use a unique value in this column.");
                    if(!validType(value,rule.type())) {issues.add("INVALID_TYPE",column,row,"Expected type: "+rule.type()+".");continue;}
                    if(!rule.values().isEmpty()&&!rule.values().contains(value))issues.add("ENUM_VALUE",column,row,"Value is outside the declared enum.");
                    if(rule.min()!=null||rule.max()!=null) {
                        BigDecimal number=new BigDecimal(value);
                        if(rule.min()!=null&&number.compareTo(rule.min())<0)issues.add("BELOW_MIN",column,row,"Value is below the declared minimum.");
                        if(rule.max()!=null&&number.compareTo(rule.max())>0)issues.add("ABOVE_MAX",column,row,"Value exceeds the declared maximum.");
                    }
                }
            }
            boolean ok=issues.total==0;if(!ok){passed=false;if(integration.severity().equals("error"))errors++;else warnings++;}
            results.add(Json.map("integration",integration.id(),"owner",integration.owner(),"severity",integration.severity(),
                "passed",ok,"missing",missing,"issueCount",issues.total,"issues",issues.saved,"truncated",issues.total>issues.saved.size()));
        }
        return Json.map("version",Main.VERSION,"passed",passed,"blocking",errors>0&&!advisory,"advisory",advisory,
            "scope",rows?"headers-and-declared-row-rules":"headers-only","header",table.header(),
            "rowsChecked",rows?table.rows().size():0,"failedIntegrations",errors,"warningIntegrations",warnings,
            "contractHash",FilesEx.hash(contract.canonical()),"results",results);
    }
    static boolean validType(String value,String type) {
        try {
            return switch(type) {
                case "string" -> true;
                case "integer" -> value.length()<=128 && value.matches("-?(0|[1-9][0-9]*)");
                case "decimal" -> value.length()<=128 && value.matches("-?(0|[1-9][0-9]*)(\\.[0-9]+)?");
                case "boolean" -> value.equals("true")||value.equals("false");
                case "date" -> value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") && LocalDate.parse(value)!=null;
                case "datetime" -> OffsetDateTime.parse(value)!=null;
                default -> false;
            };
        }catch(DateTimeException e){return false;}
    }
    public static Map<String,Object> diff(Contract contract,String before,String after) {
        List<String> old=Csv.parse(before,contract.delimiter(),false).header();
        List<String> current=Csv.parse(after,contract.delimiter(),false).header();
        List<String> added=current.stream().filter(x->!old.contains(x)).toList();
        List<String> removed=old.stream().filter(x->!current.contains(x)).toList();
        List<Object> impacted=new ArrayList<>();
        for(var i:contract.integrations()) {
            List<String> lost=i.required().stream().filter(removed::contains).toList();
            List<String> unexpected=added.stream().filter(x->!i.allowed().isEmpty()&&!i.allowed().contains(x)).toList();
            boolean order=!i.order().isEmpty()&&!i.order().equals(current);
            if(!lost.isEmpty()||!unexpected.isEmpty()||order)impacted.add(Json.map("integration",i.id(),"owner",i.owner(),"removedRequired",lost,"unexpectedAdded",unexpected,"orderMismatch",order));
        }
        boolean reordered=!old.stream().filter(current::contains).toList().equals(current.stream().filter(old::contains).toList());
        return Json.map("added",added,"removed",removed,"reordered",reordered,"impacted",impacted,
            "note","Diff compares headers only. Run check to validate the complete target contract.");
    }
    private static final class Issues {
        int total;List<Object> saved=new ArrayList<>();
        void add(String code,String column,int record,String message) {
            total++;if(saved.size()<200)saved.add(Json.map("code",code,"column",column,"record",record,"message",message));
        }
    }
}
