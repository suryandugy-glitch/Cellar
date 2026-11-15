package io.cellar;

import java.nio.file.*;
import java.nio.channels.*;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

/** One local workspace; file lock serializes mutations across Cellar processes. */
public final class Store {
    private final Path config,data;
    public Store(Path config,Path data){this.config=config.toAbsolutePath();this.data=data.toAbsolutePath();}
    public Map<String,Object> config() {
        String text=FilesEx.read(config);Contract.parse(text);
        return Json.map("config",Json.parse(text),"revision",FilesEx.hash(text),"path",config.getFileName().toString());
    }
    public Contract contract(){return Contract.parse(FilesEx.read(config));}
    public synchronized Map<String,Object> save(String text,String expectedRevision) {
        Contract.parse(text);
        return locked(()->{
            String old=FilesEx.read(config);
            if(expectedRevision==null||!FilesEx.hash(old).equals(expectedRevision))throw new Conflict();
            FilesEx.atomicWrite(config,text+ (text.endsWith("\n")?"":"\n"));return config();
        });
    }
    public synchronized void record(Map<String,Object> report) {
        locked(()->{
            List<Object> history=readHistory();List<Object> summary=new ArrayList<>();
            for(Object obj:(List<?>)report.get("results")) {
                Map<String,Object> r=Json.object(obj);
                summary.add(Json.map("integration",r.get("integration"),"passed",r.get("passed"),"severity",r.get("severity"),"issueCount",r.get("issueCount")));
            }
            history.add(0,Json.map("id",UUID.randomUUID().toString(),"timestamp",Instant.now().toString(),"passed",report.get("passed"),
                "blocking",report.get("blocking"),"scope",report.get("scope"),"advisory",report.get("advisory"),"rowsChecked",report.get("rowsChecked"),
                "contractHash",report.get("contractHash"),"results",summary));
            FilesEx.atomicWrite(data.resolve("history.json"),Json.write(history.subList(0,Math.min(100,history.size())))+"\n");return null;
        });
    }
    public synchronized List<Object> history(){return locked(this::readHistory);}
    private List<Object> readHistory() {
        Path path=data.resolve("history.json");if(!Files.exists(path))return new ArrayList<>();
        Object raw=Json.parse(FilesEx.read(path));if(!(raw instanceof List<?> list))throw new InputError("History is corrupt. Back it up before resetting it.");
        return new ArrayList<>(list);
    }
    private <T>T locked(java.util.function.Supplier<T> operation) {
        try {
            Files.createDirectories(data);
            try(FileChannel channel=FileChannel.open(data.resolve("workspace.lock"),StandardOpenOption.CREATE,StandardOpenOption.WRITE)) {
                FileLock lock;
                try{lock=channel.tryLock();}catch(OverlappingFileLockException e){throw new InputError("Workspace is busy; retry shortly.");}
                if(lock==null)throw new InputError("Workspace is busy; retry shortly.");
                try(lock){return operation.get();}
            }
        }catch(IOException e){throw new InputError("Cannot access workspace history. Check permissions.");}
    }
    public static final class Conflict extends RuntimeException {public Conflict(){super("Contract changed since it was loaded. Reload before saving.");}}
}
