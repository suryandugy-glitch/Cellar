package io.cellar.web;

import io.cellar.InputError;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.*;

/** Settings come from CELLAR_* environment variables. Local use needs none: no accounts, no login. */
public record WebConfig(String bindHost, int port, Path dataDir, URI publicOrigin, boolean trustProxy,
                        String tlsKeystore, String tlsPassword, String masterKeyEnv, String accessKey) {
    public WebConfig {
        if (publicOrigin != null) publicOrigin = normalizeOrigin(publicOrigin);
    }

    public boolean tls() { return tlsKeystore != null; }
    public boolean loopbackOnly() { return isLoopback(bindHost); }
    public boolean shared() { return !loopbackOnly() || trustProxy || publicOrigin != null && !isLoopback(publicOrigin.getHost()); }

    private static boolean isLoopback(String host) {
        return "127.0.0.1".equals(host) || "::1".equals(host) || "[::1]".equals(host) || "localhost".equalsIgnoreCase(host);
    }

    private static URI normalizeOrigin(URI url) {
        String scheme = url.getScheme() == null ? "" : url.getScheme().toLowerCase(Locale.ROOT);
        int port = url.getPort();
        if (!List.of("http", "https").contains(scheme) || url.getHost() == null ||
            url.getRawUserInfo() != null || url.getRawQuery() != null || url.getRawFragment() != null ||
            !List.of("", "/").contains(url.getRawPath()) || port == 0 || port > 65535) {
            throw new InputError("CELLAR_PUBLIC_URL must be an HTTP or HTTPS origin without a path, query, or fragment.");
        }
        if ((port == 443 && scheme.equals("https")) || (port == 80 && scheme.equals("http"))) port = -1;
        try {
            return new URI(scheme, null, url.getHost().toLowerCase(Locale.ROOT), port, null, null, null);
        } catch (URISyntaxException e) {
            throw new InputError("CELLAR_PUBLIC_URL is not a valid origin.");
        }
    }

    public static WebConfig fromEnv(Map<String, String> env, int portOverride, Path dataOverride) {
        String host = env.getOrDefault("CELLAR_BIND", "127.0.0.1");
        int port = portOverride >= 0 ? portOverride : parsePort(env.getOrDefault("CELLAR_PORT", "8080"));
        Path data = dataOverride != null ? dataOverride : Path.of(env.getOrDefault("CELLAR_DATA", "data"));
        String key = blank(env.get("CELLAR_ACCESS_KEY")), publicUrl = blank(env.get("CELLAR_PUBLIC_URL")); URI origin = null;
        if (publicUrl != null) {
            try { origin = URI.create(publicUrl); } catch (IllegalArgumentException e) { throw new InputError("CELLAR_PUBLIC_URL is not a valid URL."); }
        }
        WebConfig c = new WebConfig(host, port, data, origin, "true".equalsIgnoreCase(env.get("CELLAR_TRUST_PROXY")), blank(env.get("CELLAR_TLS_KEYSTORE")), env.get("CELLAR_TLS_PASSWORD"), env.get("CELLAR_MASTER_KEY"), key);
        c.validate(); return c;
    }
    public void validate() {
        if (port < 0 || port > 65535) throw new InputError("CELLAR_PORT must be 0-65535.");
        if (shared()) {
            if (accessKey == null || accessKey.isBlank() || accessKey.length() < 12) throw new InputError("Shared deployments need CELLAR_ACCESS_KEY (12+ characters).");
            if (publicOrigin == null || !publicOrigin.getScheme().equals("https")) throw new InputError("Shared deployments need an HTTPS CELLAR_PUBLIC_URL.");
            if (!tls() && !trustProxy) throw new InputError("Configure direct TLS or put Cellar behind a TLS proxy with CELLAR_TRUST_PROXY=true.");
            if (masterKeyEnv == null || masterKeyEnv.isBlank()) throw new InputError("Shared deployments need CELLAR_MASTER_KEY from a secret manager.");
        }
        if (publicOrigin != null && !trustProxy && tls() != publicOrigin.getScheme().equals("https"))
            throw new InputError("CELLAR_PUBLIC_URL must match the server's TLS settings.");
        if (tls() && (tlsPassword == null || tlsPassword.isEmpty())) throw new InputError("CELLAR_TLS_PASSWORD is required with CELLAR_TLS_KEYSTORE.");
    }
    private static String blank(String s) { return s == null || s.isBlank() ? null : s; }
    private static int parsePort(String s) { try { int v = Integer.parseInt(s.trim()); if (v < 0 || v > 65535) throw new NumberFormatException(); return v; } catch (NumberFormatException e) { throw new InputError("CELLAR_PORT must be 0-65535."); } }
}
