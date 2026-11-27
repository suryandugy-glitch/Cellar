import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.Instant;

/** Non-destructive regression checks: test fixtures are the only files written. */
public class SpaceFixTest {
    public static void main(String[] args) throws Exception {
        Path source = Files.createDirectory(Path.of(args[0], "source").toAbsolutePath());
        Path dest = Files.createDirectory(Path.of(args[0], "dest").toAbsolutePath());
        Path small = Files.writeString(source.resolve("a.txt"), "a");
        Path large = Files.writeString(source.resolve("b.txt"), "large file");
        Path nested = Files.createDirectory(source.resolve("nested"));
        Path sameName = Files.writeString(nested.resolve("b.txt"), "large file");
        Path blocked = Files.createDirectory(source.resolve("AppData"));
        Files.writeString(blocked.resolve("secret.txt"), "private");
        Path protectedFile = Files.writeString(source.resolve("settings.db"), "small internal DB");
        FileTime old = FileTime.from(Instant.now().minusSeconds(200L * 24 * 3600));
        Files.setLastModifiedTime(large, old);
        Files.setLastModifiedTime(sameName, old);
        try { Files.createSymbolicLink(source.resolve("linked.txt"), large); }
        catch (UnsupportedOperationException | IOException | SecurityException ignored) { /* Windows may disallow links. */ }

        var items = SpaceFix.scan(source);
        if (items.size() != 4) throw new AssertionError("bounded recursive scan, hidden files and protected directories");
        if (!items.stream().anyMatch(item -> item.path().equals(nested.resolve("b.txt"))))
            throw new AssertionError("nested files omitted");
        if (items.stream().filter(SpaceFix.Item::duplicate).count() != 1)
            throw new AssertionError("same-content SHA-256 recommendation");
        if (items.stream().filter(item -> item.path().equals(protectedFile)).anyMatch(SpaceFix.Item::suggested))
            throw new AssertionError("protected file suggested");
        if (items.stream().filter(SpaceFix.Item::duplicate).anyMatch(item -> item.score() < 90))
            throw new AssertionError("verified duplicate not prioritized");

        var first = items.stream().filter(item -> item.path().equals(large)).findFirst().orElseThrow();
        var second = items.stream().filter(item -> item.path().equals(sameName)).findFirst().orElseThrow();
        Path copy = SpaceFix.copy(first, dest);
        Path nestedCopy = SpaceFix.copy(second, dest);
        SpaceFix.verify(large, copy);
        SpaceFix.verify(sameName, nestedCopy);
        if (!Files.exists(dest.resolve("b.txt")) || !Files.exists(dest.resolve("nested/b.txt")))
            throw new AssertionError("relative paths collided");
        try {
            SpaceFix.copy(first, dest);
            throw new AssertionError("overwrote destination");
        } catch (FileAlreadyExistsException expected) { /* no overwrite */ }

        Files.writeString(copy, "wrong file");
        try {
            SpaceFix.verify(large, copy);
            throw new AssertionError("approved corrupted content");
        } catch (IOException expected) { /* mismatch rejected */ }

        Files.writeString(small, "content changed after scanning");
        var stale = items.stream().filter(item -> item.path().equals(small)).findFirst().orElseThrow();
        try {
            SpaceFix.copy(stale, dest);
            throw new AssertionError("approved changed source");
        } catch (IOException expected) { /* stale copy rejected */ }

        try {
            SpaceFix.scan(source.getRoot());
            throw new AssertionError("allowed a whole-drive scan");
        } catch (IOException expected) { /* volume roots are refused */ }

        if (args.length > 1) {
            Path otherDrive = Path.of(args[1]);
            var fresh = SpaceFix.scan(source);
            Path batch = SpaceFix.transferBatch(fresh, otherDrive,
                    fresh.stream().mapToLong(SpaceFix.Item::size).sum());
            for (var item : fresh) SpaceFix.verify(item.path(), batch.resolve(item.root().relativize(item.path())));
            try {
                SpaceFix.transferBatch(fresh, dest, fresh.stream().mapToLong(SpaceFix.Item::size).sum());
                throw new AssertionError("accepted source volume");
            } catch (IOException expected) {
                if (!expected.getMessage().contains("another physical volume")) throw expected;
            }
        }
        if (!Files.readString(large).equals("large file") || !Files.exists(small)
                || !Files.exists(protectedFile) || !Files.exists(sameName))
            throw new AssertionError("original data was altered");
        System.out.println("SpaceFix safety and intelligence tests passed.");
    }
}
