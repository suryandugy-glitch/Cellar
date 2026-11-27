import java.awt.Desktop;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.List;
import javax.swing.SwingUtilities;
import static java.nio.file.LinkOption.NOFOLLOW_LINKS;

/** SpaceFix never modifies an original unless the user separately confirms recycling. */
public final class SpaceFix {
    private SpaceFix() {}

    record Item(Path root, Path path, long size, Instant modified, String type,
                int score, boolean duplicate, String insight) {
        String relativeName() { return root.relativize(path).toString(); }
        boolean suggested() { return score >= 60; }
        public String toString() { return relativeName(); }
    }

    static List<Item> scan(Path directory) throws IOException {
        return SmartScanner.scan(directory);
    }

    static void verify(Path original, Path copy) throws IOException {
        if (!Files.isRegularFile(original, NOFOLLOW_LINKS) || !Files.isRegularFile(copy, NOFOLLOW_LINKS)
                || Files.isSameFile(original, copy) || Files.mismatch(original, copy) != -1)
            throw new IOException("Contents do not match: " + original);
    }

    static Path copy(Item item, Path batch) throws IOException {
        Path original = item.path();
        Path target = batch.resolve(item.root().relativize(original)).normalize();
        if (!target.startsWith(batch.normalize()) || !Files.isRegularFile(original, NOFOLLOW_LINKS))
            throw new IOException("Source is no longer a regular personal file: " + original);
        var before = Files.readAttributes(original, BasicFileAttributes.class, NOFOLLOW_LINKS);
        if (before.size() != item.size() || !before.lastModifiedTime().toInstant().equals(item.modified()))
            throw new IOException("Source changed after scanning: " + original);
        Files.createDirectories(target.getParent());
        Files.copy(original, target, NOFOLLOW_LINKS, StandardCopyOption.COPY_ATTRIBUTES);
        var after = Files.readAttributes(original, BasicFileAttributes.class, NOFOLLOW_LINKS);
        if (before.size() != after.size() || !before.lastModifiedTime().equals(after.lastModifiedTime()))
            throw new IOException("Source changed during copying: " + original);
        verify(original, target);
        return target;
    }

    static Path transferBatch(List<Item> selected, Path destination, long bytes) throws IOException {
        if (selected.isEmpty()) throw new IOException("Select at least one file.");
        Path dest = destination.toRealPath();
        if (!Files.isDirectory(dest, NOFOLLOW_LINKS)) throw new IOException("Destination is not a folder.");
        var destinationStore = Files.getFileStore(dest);
        Path root = selected.getFirst().root();
        if (destinationStore.equals(Files.getFileStore(root)))
            throw new IOException("Choose another physical volume to free space on this drive.");
        if (selected.stream().anyMatch(item -> !root.equals(item.root())))
            throw new IOException("All selected files must come from the current scan.");
        long required = selected.stream().mapToLong(Item::size).sum();
        if (required != bytes || required > destinationStore.getUsableSpace())
            throw new IOException("Destination does not have enough free space.");
        Path batch = Files.createTempDirectory(dest, "SpaceFix-verified-");
        try {
            for (Item item : selected) copy(item, batch);
        } catch (IOException ex) {
            throw new IOException("Incomplete copies remain in " + batch
                    + ". All originals are untouched. " + ex.getMessage(), ex);
        }
        return batch;
    }

    static boolean canRecycle() {
        return Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.MOVE_TO_TRASH);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 1 && "--smoke-test".equals(args[0])) {
            SwingUtilities.invokeAndWait(() -> {
                var app = new SpaceFixWindow();
                try {
                    app.show();
                    if (!app.frame.isShowing() || !app.frame.getTitle().contains("SpaceFix"))
                        throw new IllegalStateException("SpaceFix window did not open");
                } finally {
                    app.frame.dispose();
                }
            });
        } else if (args.length == 0) {
            SwingUtilities.invokeLater(() -> new SpaceFixWindow().show());
        } else {
            throw new IllegalArgumentException("Unknown option. Launch SpaceFix without arguments.");
        }
    }
}
