package io.cellar.web;

import io.cellar.InputError;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.*;
import java.util.*;

/**
 * All cryptography lives here so it can be reviewed in one place.
 * Only JDK primitives are used: AES-256-GCM, HMAC-SHA-256, PBKDF2-HMAC-SHA-256, SecureRandom.
 */
public final class Crypto {
    private static final SecureRandom RANDOM = new SecureRandom();
    public static final int MIN_PBKDF2_ITERATIONS = 100_000;
    public static final int DEFAULT_PBKDF2_ITERATIONS = 600_000;   // OWASP guidance for PBKDF2-HMAC-SHA256
    private final byte[] master;

    public Crypto(byte[] masterKey) {
        if (masterKey == null || masterKey.length != 32) throw new InputError("Master key must be exactly 32 bytes.");
        this.master = masterKey.clone();
    }

    /** Loads CELLAR_MASTER_KEY (base64, 32 bytes) or creates an owner-only key file on first start. */
    public static Crypto load(String envValue, Path keyFile) {
        try {
            if (envValue != null && !envValue.isBlank()) return new Crypto(Base64.getDecoder().decode(envValue.trim()));
            if (Files.exists(keyFile)) return new Crypto(Base64.getDecoder().decode(Files.readString(keyFile).trim()));
            byte[] key = randomBytes(32);
            Files.createDirectories(keyFile.toAbsolutePath().getParent());
            Files.writeString(keyFile, Base64.getEncoder().encodeToString(key) + "\n", StandardOpenOption.CREATE_NEW);
            try { Files.setPosixFilePermissions(keyFile, PosixFilePermissions.fromString("rw-------")); } catch (Exception ignored) { }
            System.err.println("WARNING  Generated a master key file. For production set CELLAR_MASTER_KEY from a secret manager instead.");
            return new Crypto(key);
        } catch (IllegalArgumentException e) {
            throw new InputError("CELLAR_MASTER_KEY must be base64 of exactly 32 random bytes (openssl rand -base64 32).");
        } catch (Exception e) {
            throw new InputError("Cannot load or create the master key.");
        }
    }

    public static byte[] randomBytes(int n) { byte[] b = new byte[n]; RANDOM.nextBytes(b); return b; }
    public static String token(int bytes) { return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(bytes)); }
    public static boolean equal(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
    public static String sha256(String s) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    /** Purpose-separated subkey: a leaked audit key cannot decrypt user data and vice versa. */
    public byte[] subkey(String purpose) { return hmacRaw(master, "cellar-subkey:" + purpose); }

    public String hmac(String purpose, String data) { return HexFormat.of().formatHex(hmacRaw(subkey(purpose), data)); }
    private static byte[] hmacRaw(byte[] key, String data) {
        try { Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(key, "HmacSHA256")); return mac.doFinal(data.getBytes(StandardCharsets.UTF_8)); }
        catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }

    /** AES-256-GCM, random 96-bit nonce, purpose bound as AAD so ciphertexts cannot be swapped between files. */
    public byte[] encrypt(String purpose, byte[] plain) {
        try {
            byte[] iv = randomBytes(12);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(subkey("enc:" + purpose), "AES"), new GCMParameterSpec(128, iv));
            c.updateAAD(purpose.getBytes(StandardCharsets.UTF_8));
            byte[] ct = c.doFinal(plain);
            byte[] out = new byte[1 + iv.length + ct.length];
            out[0] = 1; System.arraycopy(iv, 0, out, 1, iv.length); System.arraycopy(ct, 0, out, 1 + iv.length, ct.length);
            return out;
        } catch (GeneralSecurityException e) { throw new IllegalStateException("Encryption failed", e); }
    }
    public byte[] decrypt(String purpose, byte[] blob) {
        try {
            if (blob.length < 30 || blob[0] != 1) throw new InputError("Stored data is corrupt or was written by a different version.");
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(subkey("enc:" + purpose), "AES"), new GCMParameterSpec(128, blob, 1, 12));
            c.updateAAD(purpose.getBytes(StandardCharsets.UTF_8));
            return c.doFinal(blob, 13, blob.length - 13);
        } catch (AEADBadTagException e) {
            throw new InputError("Stored data failed its integrity check (wrong master key or tampering). Refusing to continue.");
        } catch (GeneralSecurityException e) { throw new IllegalStateException("Decryption failed", e); }
    }

    // ---- passwords ----
    /** Format: pbkdf2$iterations$saltB64$hashB64 */
    public static String hashPassword(String password, int iterations) {
        byte[] salt = randomBytes(16);
        return "pbkdf2$" + iterations + "$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(pbkdf2(password, salt, iterations));
    }
    public static boolean verifyPassword(String password, String stored, int minIterations) {
        try {
            String[] p = stored.split("\\$");
            if (p.length != 4 || !p[0].equals("pbkdf2")) return false;
            int iterations = Integer.parseInt(p[1]);
            if (iterations < minIterations) return false;
            byte[] expected = Base64.getDecoder().decode(p[3]);
            return MessageDigest.isEqual(expected, pbkdf2(password, Base64.getDecoder().decode(p[2]), iterations));
        } catch (RuntimeException e) { return false; }
    }
    private static byte[] pbkdf2(String password, byte[] salt, int iterations) {
        try {
            SecretKeyFactory f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return f.generateSecret(new PBEKeySpec(password.toCharArray(), salt, iterations, 256)).getEncoded();
        } catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }
}
