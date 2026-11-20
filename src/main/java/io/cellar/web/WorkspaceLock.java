package io.cellar.web;

import io.cellar.InputError;
import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.OverlappingFileLockException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/** Keep one server process in charge of each workspace's files and audit sequence. */
final class WorkspaceLock implements AutoCloseable {
    private final FileChannel channel;

    private WorkspaceLock(FileChannel channel) {
        this.channel = channel;
    }

    static WorkspaceLock acquire(Path directory) throws IOException {
        Files.createDirectories(directory);
        FileChannel channel = FileChannel.open(directory.resolve("server.lock"), StandardOpenOption.CREATE, StandardOpenOption.WRITE);
        try {
            if (channel.tryLock() != null) return new WorkspaceLock(channel);
        } catch (OverlappingFileLockException ignored) {
            // A different WebServer in this JVM already owns the workspace.
        } catch (IOException | RuntimeException e) {
            channel.close();
            throw e;
        }
        channel.close();
        throw new InputError("Another Cellar server is using this data directory.");
    }

    @Override
    public void close() throws IOException {
        channel.close();
    }
}
