package io.cellar;

import java.math.BigDecimal;
import java.util.*;

/** Strict, bounded JSON codec. No reflection, polymorphic binding, or external dependencies. */
public final class Json {
    private Json() {}
    public static Object parse(String text) {
        return parse(text, FilesEx.MAX_BYTES);
    }
    public static Object parse(String text, int maxChars) {
        if(text.length()>maxChars)throw new InputError("JSON exceeds the input limit.");
        Parser p = new Parser(text.startsWith("\ufeff") ? text.substring(1) : text);
        Object value = p.value(0); p.space();
        if (p.i != p.s.length()) throw p.error();
        return value;
    }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> object(Object value) {
        if (!(value instanceof Map<?,?>)) throw new InputError("Expected a JSON object.");
        return (Map<String,Object>) value;
    }
    @SuppressWarnings("unchecked")
    public static List<Object> array(Object value) {
        if (!(value instanceof List<?>)) throw new InputError("Expected a JSON array.");
        return (List<Object>) value;
    }
    public static String write(Object value) {
        if (value == null) return "null";
        if (value instanceof String s) {
            StringBuilder b = new StringBuilder("\"");
            for (int i=0;i<s.length();i++) {
                char c=s.charAt(i);
                switch(c) {
                    case '"' -> b.append("\\\""); case '\\' -> b.append("\\\\");
                    case '\n' -> b.append("\\n"); case '\r' -> b.append("\\r"); case '\t' -> b.append("\\t");
                    default -> { if(c<32 || Character.isSurrogate(c)) b.append(String.format("\\u%04x",(int)c)); else b.append(c); }
                }
            }
            return b.append('"').toString();
        }
        if(value instanceof Boolean || value instanceof Number) return value.toString();
        if(value instanceof Map<?,?> m) {
            StringJoiner j=new StringJoiner(",","{","}");
            m.forEach((k,v)->j.add(write(k.toString())+":"+write(v))); return j.toString();
        }
        if(value instanceof Iterable<?> a) {
            StringJoiner j=new StringJoiner(",","[","]"); for(Object v:a) j.add(write(v)); return j.toString();
        }
        throw new IllegalArgumentException("Unsupported JSON type");
    }
    /** Stable insertion order for deterministic reports. */
    public static Map<String,Object> map(Object... pairs) {
        Map<String,Object> m=new LinkedHashMap<>();
        for(int i=0;i<pairs.length;i+=2) m.put((String)pairs[i],pairs[i+1]); return m;
    }
    private static final class Parser {
        final String s; int i;
        Parser(String s) {this.s=s;}
        InputError error(){return new InputError("Invalid JSON near character "+(i+1)+".");}
        void space(){while(i<s.length() && " \t\n\r".indexOf(s.charAt(i))>=0)i++;}
        Object value(int depth) {
            if(depth>64)throw new InputError("JSON nesting exceeds 64 levels.");
            space(); if(i>=s.length())throw error(); char c=s.charAt(i);
            if(c=='"')return string();
            if(c=='{') {
                i++; space(); Map<String,Object> m=new LinkedHashMap<>();
                if(take('}'))return m;
                do {space(); if(i>=s.length()||s.charAt(i)!='"')throw error(); String key=string();
                    space(); if(!take(':')||m.containsKey(key))throw error(); m.put(key,value(depth+1)); space();
                    if(take('}'))return m; if(!take(','))throw error();
                }while(true);
            }
            if(c=='[') {
                i++; space(); List<Object> a=new ArrayList<>(); if(take(']'))return a;
                do {a.add(value(depth+1));space();if(take(']'))return a;if(!take(','))throw error();}while(true);
            }
            for(String literal:List.of("true","false","null")) if(s.startsWith(literal,i)) {
                i+=literal.length(); return literal.equals("null")?null:literal.equals("true");
            }
            int start=i;
            if(take('-') && i>=s.length())throw error();
            if(!take('0')) {if(i>=s.length()||s.charAt(i)<'1'||s.charAt(i)>'9')throw error(); digits();}
            if(take('.')) {int p=i;digits();if(p==i)throw error();}
            if(i<s.length()&&(s.charAt(i)=='e'||s.charAt(i)=='E')) {i++;if(!take('+'))take('-');int p=i;digits();if(p==i)throw error();}
            if(i-start>128)throw new InputError("JSON number exceeds 128 characters.");
            try{return new BigDecimal(s.substring(start,i));}catch(NumberFormatException e){throw error();}
        }
        void digits(){while(i<s.length()&&s.charAt(i)>='0'&&s.charAt(i)<='9')i++;}
        boolean take(char c){if(i<s.length()&&s.charAt(i)==c){i++;return true;}return false;}
        String string(){
            i++;StringBuilder b=new StringBuilder();
            while(i<s.length()) {
                char c=s.charAt(i++);if(c=='"')return b.toString();if(c<32)throw error();
                if(c=='\\') {
                    if(i>=s.length())throw error();c=s.charAt(i++);
                    switch(c){case '"','\\','/'->b.append(c);case 'b'->b.append('\b');case 'f'->b.append('\f');
                        case 'n'->b.append('\n');case 'r'->b.append('\r');case 't'->b.append('\t');
                        case 'u'->{if(i+4>s.length())throw error();try{b.append((char)Integer.parseInt(s.substring(i,i+4),16));}catch(NumberFormatException e){throw error();}i+=4;}
                        default->throw error();}
                }else b.append(c);
            }throw error();
        }
    }
}
