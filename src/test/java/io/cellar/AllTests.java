package io.cellar;

import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Dependency-free regression suite; checks do not require -ea. */
public final class AllTests {
    static int passed;static Path temp;static final String TOKEN="cellar-test-token-01234567890123456789";
    static final String LEGACY="{\"integrations\":[{\"id\":\"inventory\",\"required\":[\"order_id\",\"sku\"]},{\"id\":\"finance\",\"required\":[\"total_cents\",\"currency\"]}]}";
    interface Checked{void run()throws Exception;}
    static void test(String name,Checked task)throws Exception{try{task.run();passed++;System.out.println("PASS "+name);}catch(Throwable e){System.err.println("FAIL "+name);throw e;}}
    static void ok(boolean condition){if(!condition)throw new AssertionError("Condition failed");}
    static void eq(Object a,Object b){if(!Objects.equals(a,b))throw new AssertionError(a+" != "+b);}
    static void invalid(Runnable action){try{action.run();throw new AssertionError("Expected InputError");}catch(InputError expected){}}
    static Map<String,Object> check(String csv){return Checker.check(Contract.parse(LEGACY),csv,false);}
    static Contract single(String extra){return Contract.parse("{\"integrations\":[{\"id\":\"x\",\"required\":[\"a\"]"+extra+"}]}");}
    static boolean blocking(Contract c,String csv){return Boolean.TRUE.equals(Checker.check(c,csv,false).get("blocking"));}
    static String capture(String... args){PrintStream old=System.out;ByteArrayOutputStream out=new ByteArrayOutputStream();try{System.setOut(new PrintStream(out));Main.run(args);return out.toString(StandardCharsets.UTF_8);}finally{System.setOut(old);}}
    public static void main(String[] args)throws Exception {
        temp=Files.createTempDirectory("cellar-tests-");
        try {
            test("legacy contracts compatible",()->eq(check(Demo.CSV).get("passed"),true));
            test("rename impacts only inventory",()->{var list=(List<?>)check(Demo.csv(true)).get("results");eq(Json.object(list.get(0)).get("passed"),false);eq(Json.object(list.get(1)).get("passed"),true);});
            test("extra reordered columns",()->eq(check("notes,currency,sku,total_cents,order_id\n").get("passed"),true));
            test("case and spaces significant",()->eq(check("Order_ID, sku,total_cents,currency\n").get("passed"),false));
            test("BOM CRLF quoted headers",()->eq(check("\ufeff\"order_id\",\"sku\",total_cents,currency\r\n").get("passed"),true));
            test("no trailing newline",()->eq(check("order_id,sku,total_cents,currency").get("passed"),true));
            test("quoted delimiter escaped quotes multiline",()->eq(Csv.parse("a,b\n\"line1\nline2\",\"a,\"\"b\"\"\"\n",',',true).rows().getFirst(),List.of("line1\nline2","a,\"b\"")));
            test("semicolon and tab",()->{eq(Csv.parse("a;b\n1;2",';',true).header(),List.of("a","b"));eq(Csv.parse("a\tb\n1\t2",'\t',true).rows().size(),1);});
            test("empty blank duplicate headers",()->{for(String csv:List.of("","\n","a,,b\n","a,a\n","  \n"))invalid(()->Csv.parse(csv,',',false));});
            test("malformed quotes",()->{for(String csv:List.of("\"a","a\"b\n","\"a\"x\n"))invalid(()->Csv.parse(csv,',',true));});
            test("invalid row width",()->invalid(()->Checker.check(Contract.parse(Demo.CONFIG),"order_id,sku,total_cents,currency\n1,2\n",false)));
            test("legacy ignores data rows",()->eq(check("order_id,sku,total_cents,currency\n\"unfinished").get("passed"),true));
            test("invalid UTF8",()->invalid(()->FilesEx.decode(new byte[]{(byte)0xff})));
            test("field bound",()->invalid(()->Csv.parse("a\n"+"x".repeat(65537),',',true)));
            test("column bound",()->invalid(()->Csv.parse("a,".repeat(1000)+"b",',',false)));
            test("sample row rules pass",()->eq(Checker.check(Contract.parse(Demo.CONFIG),Demo.CSV,false).get("passed"),true));
            test("strict types",()->{ok(Checker.validType("2024-02-29","date"));ok(!Checker.validType("2025-02-29","date"));ok(Checker.validType("2026-01-01T10:00:00+05:30","datetime"));for(String v:List.of("1.2","01","NaN","1e3"," 1"))ok(!Checker.validType(v,"integer"));ok(Checker.validType("12.50","decimal"));ok(!Checker.validType("True","boolean"));});
            test("notEmpty unique",()->{var c=single(",\"rules\":{\"a\":{\"notEmpty\":true,\"unique\":true}}");ok(blocking(c,"a\nx\nx\n"));ok(blocking(c,"a\n\n"));});
            test("numeric enum",()->{ok(blocking(single(",\"rules\":{\"a\":{\"type\":\"decimal\",\"min\":0,\"max\":10}}"),"a\n-1\n11\n"));ok(blocking(single(",\"rules\":{\"a\":{\"enum\":[\"INR\"]}}"),"a\nUSD\n"));});
            test("row limits",()->{ok(blocking(single(",\"minRows\":1"),"a\n"));ok(blocking(single(",\"maxRows\":0"),"a\n1\n"));});
            test("allowed order",()->{ok(blocking(single(",\"allowed\":[\"a\"]"),"a,b\n"));ok(blocking(single(",\"order\":[\"a\",\"b\"]"),"b,a\n"));});
            test("warning does not block",()->{var r=Checker.check(single(",\"severity\":\"warning\""),"b\n",false);eq(r.get("passed"),false);eq(r.get("blocking"),false);});
            test("advisory preserves findings",()->{var r=Checker.check(Contract.parse(LEGACY),"a\n",true);eq(r.get("passed"),false);eq(r.get("blocking"),false);});
            test("determinism cell redaction",()->{var c=single(",\"rules\":{\"a\":{\"type\":\"integer\"}}");var r=Checker.check(c,"a\nPRIVATE-SECRET\n",false);eq(Json.write(r),Json.write(Checker.check(c,"a\nPRIVATE-SECRET\n",false)));ok(!(Json.write(r)+Reports.text(r)+Reports.markdown(r)).contains("PRIVATE-SECRET"));});
            test("issue cap full count",()->{var r=Checker.check(single(",\"rules\":{\"a\":{\"type\":\"integer\"}}"),"a\n"+"x\n".repeat(250),false);var i=Json.object(((List<?>)r.get("results")).getFirst());eq(i.get("issueCount"),250);eq(((List<?>)i.get("issues")).size(),200);eq(i.get("truncated"),true);});
            test("diff impact",()->{var r=Checker.diff(Contract.parse(Demo.CONFIG),Demo.CSV,Demo.csv(true));eq(r.get("removed"),List.of("order_id"));eq(r.get("added"),List.of("id"));eq(((List<?>)r.get("impacted")).size(),1);});
            test("diff reorder",()->eq(Checker.diff(single(""),"a,b\n","b,a\n").get("reordered"),true));
            test("invalid configs typo rejection",()->{for(String c:List.of("{}","null","{\"integrations\":[]}","{\"integrations\":[{\"id\":\"x\",\"required\":[\"a\"],\"requried\":[]}]}"))invalid(()->Contract.parse(c));invalid(()->single(",\"severity\":\"oops\""));invalid(()->single(",\"rules\":{\"a\":{\"type\":\"string\",\"min\":0}}"));invalid(()->single(",\"minRows\":-1"));invalid(()->single(",\"rules\":{\"b\":{}}"));});
            test("JSON strict nesting duplicate keys",()->{for(String s:List.of("{\"a\":1,\"a\":2}","[1,]","01","1e","{x:1}","\"\n\"","[".repeat(70)+"]".repeat(70)))invalid(()->Json.parse(s));});
            test("JSON unicode",()->{String s="Bengali বাংলা \"quoted\"\n 😃";eq(Json.parse(Json.write(s)),s);});
            test("row bound",()->invalid(()->Csv.parse("a\n"+"x\n".repeat(100001),',',true)));
            test("file byte bound",()->{Path large=temp.resolve("large.csv");Files.write(large,new byte[FilesEx.MAX_BYTES+1]);invalid(()->FilesEx.read(large));});
            test("JSON editor size bound",()->invalid(()->Json.parse(" ".repeat(FilesEx.MAX_BYTES+1))));
            test("duplicate IDs rejected",()->invalid(()->Contract.parse("{\"integrations\":[{\"id\":\"x\",\"required\":[\"a\"]},{\"id\":\"x\",\"required\":[\"b\"]}]}")));
            test("empty optional values skip other rules",()->ok(!blocking(single(",\"rules\":{\"a\":{\"type\":\"integer\",\"unique\":true}}"),"a\n\n\n")));
            Path cfg=temp.resolve("cellar.json");Files.writeString(cfg,Demo.CONFIG);Store store=new Store(cfg,temp.resolve(".cellar"));
            test("config stale save",()->{String rev=(String)store.config().get("revision");store.save(LEGACY,rev);try{store.save(Demo.CONFIG,rev);throw new AssertionError();}catch(Store.Conflict expected){}eq(store.contract().integrations().size(),2);});
            test("history survives reopen",()->{store.record(check(Demo.CSV));eq(new Store(cfg,temp.resolve(".cellar")).history().size(),1);});
            test("history retention redaction",()->{for(int i=0;i<105;i++)store.record(check(Demo.CSV));eq(store.history().size(),100);ok(!Json.write(store.history()).contains("ORD-001"));});
            test("history corruption fails closed",()->{Path dir=temp.resolve("broken");Files.createDirectories(dir);Files.writeString(dir.resolve("history.json"),"broken");invalid(()->new Store(cfg,dir).record(check(Demo.CSV)));eq(Files.readString(dir.resolve("history.json")),"broken");});
            Path csv=temp.resolve("sales.csv");Files.writeString(csv,Demo.CSV);
            test("CLI exit codes",()->{eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",csv.toString()}),0);Files.writeString(csv,Demo.csv(true));eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",csv.toString()}),1);eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",temp.resolve("absent").toString()}),2);});
            test("CLI bad options formats",()->{eq(Main.run(new String[]{"check","--wat"}),2);eq(Main.run(new String[]{"check","--csv",csv.toString(),"--format","xml"}),2);});
            test("CLI JSON errors",()->eq(Json.object(Json.parse(capture("check","--config",cfg.toString(),"--csv",temp.resolve("absent").toString(),"--format","json"))).get("exitCode"),new java.math.BigDecimal(2)));
            test("CLI protects inputs",()->{String original=Files.readString(csv);eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",csv.toString(),"--output",csv.toString()}),2);eq(Files.readString(csv),original);});
            test("CLI init protects config",()->eq(Main.run(new String[]{"init","--config",cfg.toString()}),2));
            test("CLI demo generation",()->{Path out=temp.resolve("demo.csv");eq(Main.run(new String[]{"export-demo","--out",out.toString()}),0);eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",out.toString()}),0);});
            test("CLI advisory and invalid remain distinct",()->{eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",csv.toString(),"--advisory"}),0);Path bad=temp.resolve("empty.csv");Files.writeString(bad,"");eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",bad.toString(),"--advisory"}),2);});
            test("CLI writes JSON report",()->{Path report=temp.resolve("report.json");eq(Main.run(new String[]{"check","--config",cfg.toString(),"--csv",csv.toString(),"--format","json","--output",report.toString()}),1);eq(Json.object(Json.parse(Files.readString(report))).get("blocking"),true);});
            test("invalid edit preserves contract",()->{String original=Files.readString(cfg);invalid(()->store.save("{}",(String)store.config().get("revision")));eq(Files.readString(cfg),original);});
            test("GitHub summary process integration",()->{
                Path summary=temp.resolve("summary.md");
                String bin=Path.of(System.getProperty("java.home"),"bin",System.getProperty("os.name").startsWith("Windows")?"java.exe":"java").toString();
                ProcessBuilder process=new ProcessBuilder(bin,"-cp",System.getProperty("java.class.path"),"io.cellar.Main","check","--config",cfg.toString(),"--csv",csv.toString(),"--summary");
                process.environment().put("GITHUB_STEP_SUMMARY",summary.toString());process.redirectOutput(ProcessBuilder.Redirect.DISCARD);process.redirectError(ProcessBuilder.Redirect.DISCARD);
                eq(process.start().waitFor(),1);ok(Files.readString(summary).contains("MISSING_COLUMN"));
            });
            WebTests.run();
            System.out.println("SUCCESS: "+passed+" test groups passed.");
        }finally {try(var files=Files.walk(temp)){for(Path p:files.sorted(Comparator.reverseOrder()).toList())Files.deleteIfExists(p);}}
    }
}
