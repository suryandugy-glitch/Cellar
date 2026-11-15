package io.cellar;

import java.util.*;

/** Strict comma/semicolon/tab CSV with escaped quotes, BOM, CRLF, and multiline fields. */
public final class Csv {
    public record Table(List<String> header,List<List<String>> rows) {}
    private final String text; private final char delimiter; private int pos;
    private Csv(String text,char delimiter) {this.text=text;this.delimiter=delimiter;pos=text.startsWith("\ufeff")?1:0;}
    public static Table parse(String text,char delimiter,boolean data) {
        if(text.length()>FilesEx.MAX_BYTES)throw new InputError("CSV exceeds the input limit.");
        Csv p=new Csv(text,delimiter); List<String> header=p.record();
        if(header==null)throw new InputError("CSV is empty; generate an export first.");
        Set<String> seen=new HashSet<>();
        for(String h:header) {
            if(h.isBlank())throw new InputError("CSV contains a blank header name.");
            if(!seen.add(h))throw new InputError("CSV contains duplicate header names.");
            if(h.chars().anyMatch(c->c<32||c==127))throw new InputError("Header names cannot contain control characters.");
        }
        List<List<String>> rows=new ArrayList<>();
        if(data) {List<String> row;while((row=p.record())!=null) {
            if(rows.size()>=100_000)throw new InputError("CSV exceeds 100000 data rows.");
            if(row.size()!=header.size())throw new InputError("CSV record "+(rows.size()+2)+" has a different column count from the header.");
            rows.add(List.copyOf(row));
        }}
        return new Table(List.copyOf(header),List.copyOf(rows));
    }
    private List<String> record() {
        if(pos>=text.length())return null;
        List<String> cells=new ArrayList<>();StringBuilder cell=new StringBuilder();
        boolean quoted=false,closed=false;
        while(pos<text.length()) {
            char c=text.charAt(pos++);
            if(quoted) {
                if(c=='"') {if(pos<text.length()&&text.charAt(pos)=='"'){pos++;cell.append('"');}else {quoted=false;closed=true;}}
                else cell.append(c);
            }else if(c==delimiter) {add(cells,cell);closed=false;}
            else if(c=='\r'||c=='\n') {if(c=='\r'&&pos<text.length()&&text.charAt(pos)=='\n')pos++;add(cells,cell);return cells;}
            else if(closed)throw new InputError("Unexpected character after a closing CSV quote.");
            else if(c=='"') {if(!cell.isEmpty())throw new InputError("Quote inside an unquoted CSV field.");quoted=true;}
            else cell.append(c);
            if(cell.length()>65536)throw new InputError("CSV field exceeds 65536 characters.");
        }
        if(quoted)throw new InputError("Unclosed CSV quoted field.");
        add(cells,cell);return cells;
    }
    private void add(List<String> cells,StringBuilder cell) {
        if(cells.size()>=1000)throw new InputError("CSV exceeds 1000 columns.");
        cells.add(cell.toString());cell.setLength(0);
    }
}
