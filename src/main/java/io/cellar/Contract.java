package io.cellar;

import java.math.BigDecimal;
import java.util.*;

public record Contract(List<Integration> integrations, char delimiter, boolean validateRows, String canonical) {
    public record Rule(String type,boolean notEmpty,boolean unique,List<String> values,BigDecimal min,BigDecimal max) {}
    public record Integration(String id,String owner,String description,String severity,List<String> required,
                              List<String> allowed,List<String> order,Map<String,Rule> rules,Integer minRows,Integer maxRows,
                              List<List<String>> uniqueKeys) {}

    public boolean hasRowRules() {
        return integrations.stream().anyMatch(i -> !i.rules().isEmpty() || i.minRows() != null ||
            i.maxRows() != null || !i.uniqueKeys().isEmpty());
    }

    public boolean checksRows() {
        return validateRows || hasRowRules();
    }
    public static Contract parse(String json){return from(Json.parse(json));}
    public static Contract from(Object raw) {
        Map<String,Object> root=Json.object(raw);keys(root,"integrations","delimiter","version","validateRows");
        if(root.containsKey("version") && (!(root.get("version") instanceof BigDecimal v)||v.compareTo(BigDecimal.valueOf(2))!=0))
            throw new InputError("Contract version must be 2, or omitted for legacy contracts.");
        String separator=optional(root,"delimiter",",");
        if(!List.of(",",";","\t").contains(separator))throw new InputError("Delimiter must be comma, semicolon, or tab.");
        if(!(root.get("integrations") instanceof List<?> items)||items.isEmpty()||items.size()>100)
            throw new InputError("Provide between 1 and 100 integrations.");
        List<Integration> integrations=new ArrayList<>();Set<String> ids=new HashSet<>();
        for(Object obj:items) {
            Map<String,Object> m=Json.object(obj);
            keys(m,"id","owner","description","severity","required","allowed","order","rules","minRows","maxRows","uniqueKeys");
            String id=name(m.get("id"));if(!ids.add(id))throw new InputError("Duplicate integration id.");
            List<String> required=strings(m.get("required"),true);
            List<String> allowed=m.containsKey("allowed")?strings(m.get("allowed"),true):List.of();
            List<String> order=m.containsKey("order")?strings(m.get("order"),true):List.of();
            if(!allowed.isEmpty()&&!allowed.containsAll(required))throw new InputError("Allowed columns must include every required column.");
            if(!order.isEmpty()&&!order.containsAll(required))throw new InputError("Order must include every required column.");
            String severity=optional(m,"severity","error");
            if(!List.of("error","warning").contains(severity))throw new InputError("Severity must be error or warning.");
            Map<String,Rule> rules=new LinkedHashMap<>();
            if(m.containsKey("rules")) for(var e:Json.object(m.get("rules")).entrySet()) {
                String column=name(e.getKey());
                if(!required.contains(column))throw new InputError("Rule columns must also be in required.");
                Map<String,Object> r=Json.object(e.getValue());keys(r,"type","notEmpty","unique","enum","min","max");
                String type=optional(r,"type","string");
                if(!List.of("string","integer","decimal","boolean","date","datetime").contains(type))throw new InputError("Unknown rule type.");
                BigDecimal min=number(r,"min"),max=number(r,"max");
                if((min!=null||max!=null)&&!List.of("integer","decimal").contains(type))throw new InputError("min/max require a numeric type.");
                if(min!=null&&max!=null&&min.compareTo(max)>0)throw new InputError("Rule min exceeds max.");
                rules.put(column,new Rule(type,bool(r,"notEmpty"),bool(r,"unique"),r.containsKey("enum")?strings(r.get("enum"),true):List.of(),min,max));
            }
            Integer minRows=count(m,"minRows"),maxRows=count(m,"maxRows");
            if(minRows!=null&&maxRows!=null&&minRows>maxRows)throw new InputError("minRows exceeds maxRows.");
            integrations.add(new Integration(id,optional(m,"owner","Unassigned"),optional(m,"description",""),severity,
                required,allowed,order,Collections.unmodifiableMap(rules),minRows,maxRows,uniqueKeys(m,required)));
        }
        return new Contract(List.copyOf(integrations),separator.charAt(0),bool(root,"validateRows"),Json.write(root));
    }
    private static List<List<String>> uniqueKeys(Map<String,Object> integration, List<String> required) {
        if(!integration.containsKey("uniqueKeys")) return List.of();
        if(!(integration.get("uniqueKeys") instanceof List<?> groups) || groups.isEmpty() || groups.size()>16)
            throw new InputError("uniqueKeys must contain 1 to 16 column groups.");

        List<List<String>> keys = new ArrayList<>();
        Set<Set<String>> seen = new HashSet<>();
        for(Object group : groups) {
            if(!(group instanceof List<?> columns) || columns.size()<2 || columns.size()>16)
                throw new InputError("Each uniqueKeys group must contain 2 to 16 required columns.");
            List<String> key = strings(columns,true);
            if(key.size()!=columns.size() || !required.containsAll(key))
                throw new InputError("A uniqueKeys group must use distinct columns from required.");
            if(!seen.add(Set.copyOf(key)))
                throw new InputError("Duplicate uniqueKeys group.");
            keys.add(key);
        }
        return List.copyOf(keys);
    }

    private static void keys(Map<String,Object> m,String... allowed) {
        Set<String> names=Set.of(allowed);for(String k:m.keySet())if(!names.contains(k))throw new InputError("Unknown configuration property; check the contract reference.");
    }
    private static String name(Object v){if(!(v instanceof String s)||s.isBlank()||s.length()>256||s.chars().anyMatch(c->c<32||c==127))throw new InputError("Names must be nonblank strings of at most 256 characters without controls.");return s;}
    private static String optional(Map<String,Object> m,String k,String fallback) {
        if(!m.containsKey(k))return fallback;
        if(!(m.get(k) instanceof String s)||s.length()>1000)throw new InputError(k+" must be a string of at most 1000 characters.");return s;
    }
    private static List<String> strings(Object v,boolean required) {
        if(!(v instanceof List<?> a)||a.size()>1000||(required&&a.isEmpty()))throw new InputError("Column and enum lists must have 1 to 1000 strings.");
        LinkedHashSet<String> result=new LinkedHashSet<>();for(Object item:a)result.add(name(item));return List.copyOf(result);
    }
    private static boolean bool(Map<String,Object> m,String k){if(!m.containsKey(k))return false;if(!(m.get(k) instanceof Boolean b))throw new InputError(k+" must be boolean.");return b;}
    private static BigDecimal number(Map<String,Object> m,String k){if(!m.containsKey(k))return null;if(!(m.get(k) instanceof BigDecimal n))throw new InputError(k+" must be a JSON number.");return n;}
    private static Integer count(Map<String,Object> m,String k){BigDecimal n=number(m,k);if(n==null)return null;try{int i=n.intValueExact();if(i<0||i>100000)throw new ArithmeticException();return i;}catch(ArithmeticException e){throw new InputError(k+" must be an integer from 0 to 100000.");}}
}
