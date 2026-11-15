package io.cellar.web;

import io.cellar.InputError;
import java.net.URI;
import java.nio.file.Path;
import java.util.*;

/** Settings come from CELLAR_* environment variables. Local use needs none: no accounts, no login. */
public record WebConfig(String bindHost, int port, Path dataDir, URI publicOrigin, boolean trustProxy,
                        String tlsKeystore, String tlsPassword, String masterKeyEnv, String accessKey) {
    public boolean tls() { return tlsKeystore != null; }
    public boolean loopbackOnly() { return bindHost.equals("127.0.0.1") || bindHost.equals("::1"); }

    public static WebConfig fromEnv(Map<String, String> env, int portOverride, Path dataOverride) {
        String host = env.getOrDefault("CELLAR_BIND", "127.0.0.1");
        int port = portOverride >= 0 ? portOverride : parsePort(env.getOrDefault("CELLAR_PORT", "8080"));
        Path data = dataOverride != null ? dataOverride : Path.of(env.getOrDefault("CELLAR_DATA", "data"));
        String key = blank(env.get("CELLAR_ACCESS_KEY")), publicUrl = blank(env.get("CELLAR_PUBLIC_URL")); URI origin = null;
        if (publicUrl != null) {
            try { origin = URI.create(publicUrl); } catch (IllegalArgumentException e) { throw new InputError("CELLAR_PUBLIC_URL is not a valid URL."); }
            if (origin.getHost() == null || origin.getScheme() == null || !List.of("http", "https").contains(origin.getScheme())) throw new InputError("CELLAR_PUBLIC_URL must look like https://cellar.example.com.");
        }
        WebConfig c = new WebConfig(host, port, data, origin, "true".equalsIgnoreCase(env.get("CELLAR_TRUST_PROXY")), blank(env.get("CELLAR_TLS_KEYSTORE")), env.get("CELLAR_TLS_PASSWORD"), env.get("CELLAR_MASTER_KEY"), key);
        c.validate(); return c;
    }
    /** The one guard rail kept: never expose the app to a network without a shared access key. */
    public void validate() {
        if (!loopbackOnly() && (accessKey == null || accessKey.length() < 12)) throw new InputError("Listening beyond localhost needs CELLAR_ACCESS_KEY (12+ characters).");
        if (!loopbackOnly() && publicOrigin == null) throw new InputError("Set CELLAR_PUBLIC_URL when listening on a network interface.");
        if (tls() && (tlsPassword == null || tlsPassword.isEmpty())) throw new InputError("CELLAR_TLS_PASSWORD is required with CELLAR_TLS_KEYSTORE.");
    }
    private static String blank(String s) { return s == null || s.isBlank() ? null : s; }
    private static int parsePort(String s) { try { int v = Integer.parseInt(s.trim()); if (v < 0 || v > 65535) throw new NumberFormatException(); return v; } catch (NumberFormatException e) { throw new InputError("CELLAR_PORT must be 0-65535."); } }
}
