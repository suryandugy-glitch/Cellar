package io.cellar;

/** An invalid configuration, CSV, or request. No successful verification is implied. */
public final class InputError extends RuntimeException {
    public InputError(String message) { super(message); }
}
