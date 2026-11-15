package io.cellar;

import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.security.*;
import java.util.HexFormat;

public final class FilesEx {
    public static final int MAX_BYTES=8*1024*1024;
    private FilesEx() {}
    public static String decode(byte[] bytes) {
        try {return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();}
        catch(CharacterCodingException e){throw new InputError("Input is not valid UTF-8.");}
    }
    public static String read(Path path) {
        try(InputStream in=Files.newInputStream(path)) {
            byte[] bytes=in.readNBytes(MAX_BYTES+1);
            if(bytes.length>MAX_BYTES)throw new InputError("Input exceeds the 8 MiB limit.");
            return decode(bytes);
        }catch(IOException e){throw new InputError("Cannot read file: "+path.getFileName()+". Check its location and permissions.");}
    }
    public static void atomicWrite(Path path,String text) {
        Path target=path.toAbsolutePath();Path temp=null;
        try {
            Files.createDirectories(target.getParent());temp=Files.createTempFile(target.getParent(),".cellar-",".tmp");
            Files.writeString(temp,text,StandardCharsets.UTF_8);
            try {Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}
            catch(AtomicMoveNotSupportedException e){Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING);}
        }catch(IOException e){throw new InputError("Cannot save file: "+path.getFileName()+". Check permissions and free space.");}
        finally {if(temp!=null)try{Files.deleteIfExists(temp);}catch(IOException ignored){}}
    }
    public static String hash(String s) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
