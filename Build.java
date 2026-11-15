import javax.tools.ToolProvider;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;

/** Offline build and test runner: java Build.java [test|package|clean]. JDK 21+. */
public class Build {
    public static void main(String[] args)throws Exception {
        String task=args.length==0?"test":args[0];
        if(!Set.of("test","package","clean").contains(task))throw new IllegalArgumentException("Use test, package or clean");
        if(task.equals("clean")){remove(Path.of("build"));remove(Path.of("dist"));return;}
        if(Runtime.version().feature()<21)throw new IllegalStateException("Install JDK 21 or newer");
        var compiler=ToolProvider.getSystemJavaCompiler();if(compiler==null)throw new IllegalStateException("A full JDK 21+ is required to build");
        Path classes=Path.of("build/classes");remove(classes);Files.createDirectories(classes);
        List<String> flags=new ArrayList<>(compatibility());flags.addAll(List.of("-encoding","UTF-8","-d",classes.toString()));
        try(var files=Files.walk(Path.of("src/main/java"))){files.filter(p->p.toString().endsWith(".java")).sorted().forEach(p->flags.add(p.toString()));}
        if(compiler.run(null,null,null,flags.toArray(String[]::new))!=0)System.exit(2);
        Path res=Path.of("src/main/resources");
        if(Files.exists(res))try(var files=Files.walk(res)){for(Path p:files.filter(Files::isRegularFile).toList()){Path to=classes.resolve(res.relativize(p).toString());Files.createDirectories(to.getParent());Files.copy(p,to,StandardCopyOption.REPLACE_EXISTING);}}
        if(task.equals("test")) {
            Path tests=Path.of("build/test-classes");remove(tests);Files.createDirectories(tests);
            List<String> testFlags=new ArrayList<>(compatibility());testFlags.addAll(List.of("-encoding","UTF-8","-cp",classes.toString(),"-d",tests.toString()));
            try(var files=Files.walk(Path.of("src/test/java"))){files.filter(p->p.toString().endsWith(".java")).sorted().forEach(p->testFlags.add(p.toString()));}
            if(compiler.run(null,null,null,testFlags.toArray(String[]::new))!=0)System.exit(2);
            String javaBin=Path.of(System.getProperty("java.home"),"bin",System.getProperty("os.name").startsWith("Windows")?"java.exe":"java").toString();
            int result=new ProcessBuilder(javaBin,"-Djava.awt.headless=true","-cp",classes+java.io.File.pathSeparator+tests,"io.cellar.AllTests").inheritIO().start().waitFor();
            if(result!=0)System.exit(result);
        }
        Files.createDirectories(Path.of("dist"));Manifest manifest=new Manifest();manifest.getMainAttributes().put(Attributes.Name.MANIFEST_VERSION,"1.0");
        manifest.getMainAttributes().put(Attributes.Name.MAIN_CLASS,"io.cellar.Main");
        try(JarOutputStream jar=new JarOutputStream(Files.newOutputStream(Path.of("dist/cellar.jar")),manifest);var files=Files.walk(classes)){
            for(Path file:files.filter(Files::isRegularFile).sorted().toList()) {
                JarEntry entry=new JarEntry(classes.relativize(file).toString().replace('\\','/'));entry.setTime(0);jar.putNextEntry(entry);Files.copy(file,jar);jar.closeEntry();
            }
        }
        System.out.println("Built dist/cellar.jar");
    }
    private static List<String> compatibility(){
        // Some minimal JDK 21 environments omit ct.sym but expose the compiler module.
        if(Runtime.version().feature()==21 && !Files.exists(Path.of(System.getProperty("java.home"),"lib","ct.sym")))
            return List.of("-source","21","-target","21");
        return List.of("--release","21");
    }
    private static void remove(Path root)throws Exception{if(Files.exists(root))try(var files=Files.walk(root)){for(Path p:files.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}}
}
