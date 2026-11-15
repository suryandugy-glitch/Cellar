package io.cellar.web;

import java.util.*;

/** Token buckets keyed by caller. Memory is bounded so the limiter itself cannot be used for exhaustion. */
public final class RateLimiter {
    private static final class Bucket { double tokens; long last; }
    private final Map<String, Bucket> buckets = new LinkedHashMap<>(256, 0.75f, true);
    private final int maxKeys;

    public RateLimiter(int maxKeys) { this.maxKeys = maxKeys; }

    /** @param capacity burst size; @param perMinute sustained refill rate */
    public synchronized boolean allow(String key, int capacity, double perMinute) {
        long now = System.nanoTime();
        Bucket b = buckets.get(key);
        if (b == null) {
            if (buckets.size() >= maxKeys) { Iterator<String> it = buckets.keySet().iterator(); it.next(); it.remove(); }
            b = new Bucket(); b.tokens = capacity; b.last = now; buckets.put(key, b);
        }
        b.tokens = Math.min(capacity, b.tokens + (now - b.last) / 6e10 * perMinute); b.last = now;
        if (b.tokens < 1) return false;
        b.tokens -= 1; return true;
    }
}
