package io.cellar.web;

import io.cellar.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Map;

/** Encrypted-at-rest JSON files. A stolen data directory is useless without the master key. */
public final class Vault {
    private final Path dir;
    private final Crypto crypto;

    public Vault(Path dir, Crypto crypto) {
        this.dir = dir.toAbsolutePath();
        this.crypto = crypto;
        try {
            Files.createDirectories(this.dir);
            try { Files.setPosixFilePermissions(this.dir, PosixFilePermissions.fromString("rwx------")); } catch (Exception ignored) { }
        } catch (IOException e) { throw new InputError("Cannot create the data directory."); }
    }
    public Path dir() { return dir; }
    public Crypto crypto() { return crypto; }

    /** Returns null when the file does not exist; throws InputError if it fails authentication. */
    public Map<String, Object> read(String name) {
        Path p = dir.resolve(name);
        if (!Files.exists(p)) return null;
        try {
            byte[] plain = crypto.decrypt(name, Files.readAllBytes(p));
            return Json.object(Json.parse(new String(plain, StandardCharsets.UTF_8)));
        } catch (IOException e) { throw new InputError("Cannot read stored data."); }
    }

    public void write(String name, Map<String, Object> value) {
        Path target = dir.resolve(name);
        Path temp = null;
        try {
            byte[] blob = crypto.encrypt(name, Json.write(value).getBytes(StandardCharsets.UTF_8));
            temp = Files.createTempFile(dir, ".w-", ".tmp");
            try { Files.setPosixFilePermissions(temp, PosixFilePermissions.fromString("rw-------")); } catch (Exception ignored) { }
            Files.write(temp, blob);
            try { Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException e) { Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING); }
        } catch (IOException e) { throw new InputError("Cannot save data. Check permissions and free space."); }
        finally { if (temp != null) try { Files.deleteIfExists(temp); } catch (IOException ignored) { } }
    }
}
