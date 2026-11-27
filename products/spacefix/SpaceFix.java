import java.awt.*;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import javax.swing.*;
import static java.nio.file.LinkOption.NOFOLLOW_LINKS;

public final class SpaceFix {
    record Item(Path path, long size) {
        public String toString() { return String.format("%,d bytes    %s", size, path); }
    }

    static List<Item> scan(Path directory) throws IOException {
        if (directory.getParent() == null) throw new IOException("Choose a personal folder inside the drive.");
        var items = new ArrayList<Item>();
        // One folder at a time keeps the scan bounded and avoids traversing junctions.
        try (var children = Files.newDirectoryStream(directory)) {
            for (Path path : children) {
                var attrs = Files.readAttributes(path, BasicFileAttributes.class, NOFOLLOW_LINKS);
                if (attrs.isRegularFile() && !Files.isHidden(path)) items.add(new Item(path, attrs.size()));
            }
        }
        items.sort(Comparator.comparingLong(Item::size).reversed());
        return items;
    }

    static void verify(Path original, Path copy) throws IOException {
        if (!Files.isRegularFile(original, NOFOLLOW_LINKS) || !Files.isRegularFile(copy, NOFOLLOW_LINKS)
                || Files.isSameFile(original, copy) || Files.mismatch(original, copy) != -1)
            throw new IOException("Verification failed for " + original);
    }

    static Path copy(Item item, Path batch) throws IOException {
        Path target = batch.resolve(item.path().getFileName());
        if (!Files.isRegularFile(item.path(), NOFOLLOW_LINKS))
            throw new IOException("Source changed: " + item.path());
        Files.copy(item.path(), target, NOFOLLOW_LINKS, StandardCopyOption.COPY_ATTRIBUTES);
        verify(item.path(), target);
        return target;
    }

    final JFrame frame = new JFrame("Cellar SpaceFix");
    final DefaultListModel<Item> model = new DefaultListModel<>();
    final JList<Item> files = new JList<>(model);
    final JLabel status = new JLabel("Choose a personal folder, such as Downloads or Videos.");
    final JButton choose = new JButton("Choose source folder");
    final JButton transfer = new JButton("Copy selected to another drive…");
    final JButton cleanup = new JButton("Review verified originals…");
    final JButton open = new JButton("Open copies");
    Path batch;
    List<Item> verified = List.of();

    interface Job<T> { T run() throws Exception; }
    <T> void work(String message, Job<T> job, java.util.function.Consumer<T> done) {
        status.setText(message);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        buttons(false);
        new SwingWorker<T, Void>() {
            protected T doInBackground() throws Exception { return job.run(); }
            protected void done() {
                try { done.accept(get()); }
                catch (Exception e) {
                    Throwable cause = e.getCause() == null ? e : e.getCause();
                    status.setText("Operation stopped. Review the folders before retrying.");
                    JOptionPane.showMessageDialog(frame, cause.toString(), "SpaceFix", JOptionPane.ERROR_MESSAGE);
                } finally {
                    frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
                    buttons(true);
                }
            }
        }.execute();
    }

    void buttons(boolean ready) {
        choose.setEnabled(ready);
        files.setEnabled(ready);
        transfer.setEnabled(ready && !files.isSelectionEmpty());
        cleanup.setEnabled(ready && !verified.isEmpty() && Desktop.isDesktopSupported()
                && Desktop.getDesktop().isSupported(Desktop.Action.MOVE_TO_TRASH));
        open.setEnabled(ready && batch != null);
    }

    Path folder(String title) {
        var dialog = new JFileChooser();
        dialog.setDialogTitle(title);
        dialog.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        return dialog.showOpenDialog(frame) == JFileChooser.APPROVE_OPTION
                ? dialog.getSelectedFile().toPath().toAbsolutePath() : null;
    }

    void scanFolder() {
        Path source = folder("Choose a personal folder");
        if (source == null) return;
        work("Reading file sizes…", () -> scan(source.toRealPath()), items -> {
            verified = List.of();
            batch = null;
            model.clear();
            model.addAll(items);
            status.setText(items.size() + " files in " + source + " — select files to copy.");
        });
    }

    void transfer() {
        var selected = List.copyOf(files.getSelectedValuesList());
        Path destination = folder("Choose a folder on another drive");
        if (selected.isEmpty() || destination == null) return;
        long bytes = selected.stream().mapToLong(Item::size).sum();
        if (JOptionPane.showConfirmDialog(frame, String.format("Copy %d selected files (%,d bytes) to %s?",
                selected.size(), bytes, destination), "Confirm copy", JOptionPane.OK_CANCEL_OPTION)
                != JOptionPane.OK_OPTION) return;
        verified = List.of();
        batch = null;
        work("Copying files and comparing their contents…", () -> {
            Path dest = destination.toRealPath();
            var store = Files.getFileStore(dest);
            if (store.equals(Files.getFileStore(selected.getFirst().path())))
                throw new IOException("Choose a different drive to free space on the source.");
            if (store.getUsableSpace() < bytes) throw new IOException("Destination has insufficient free space.");
            Path dir = Files.createTempDirectory(dest, "SpaceFix-");
            try {
                for (Item item : selected) copy(item, dir);
            } catch (IOException ex) {
                throw new IOException("Incomplete batch in " + dir + ". Originals retained. " + ex.getMessage(), ex);
            }
            return dir;
        }, dir -> {
            batch = dir;
            verified = selected;
            status.setText("Verified " + selected.size() + " copies. Open copies to inspect them before cleanup.");
        });
    }

    void cleanup() {
        var items = verified;
        var list = new JList<>(items.toArray(Item[]::new));
        var message = new Object[]{"Move these originals to the Recycle Bin?", new JScrollPane(list),
                "Close apps editing these files first. Empty the bin separately to reclaim space."};
        if (JOptionPane.showConfirmDialog(frame, message, "Review originals", JOptionPane.OK_CANCEL_OPTION)
                != JOptionPane.OK_OPTION) return;
        Path dir = batch;
        verified = List.of();
        work("Rechecking each copy before recycling its original…", () -> {
            int count = 0;
            for (Item item : items) {
                try {
                    verify(item.path(), dir.resolve(item.path().getFileName()));
                    if (!Desktop.getDesktop().moveToTrash(item.path().toFile()))
                        throw new IOException("Recycle Bin unavailable for " + item.path());
                    count++;
                } catch (IOException | RuntimeException e) {
                    throw new IOException(count + " originals recycled. Stopped at " + item.path() + ". " + e.getMessage(), e);
                }
            }
            return count;
        }, count -> {
            items.forEach(model::removeElement);
            status.setText(count + " originals recycled. Empty the Recycle Bin when ready to reclaim space.");
        });
    }

    void show() {
        var panel = new JPanel(new BorderLayout(10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        var top = new JPanel(new BorderLayout());
        top.add(choose, BorderLayout.WEST);
        top.add(new JLabel("   Files in this folder, largest first"), BorderLayout.CENTER);
        panel.add(top, BorderLayout.NORTH);
        panel.add(new JScrollPane(files), BorderLayout.CENTER);
        var actions = new JPanel(new FlowLayout(FlowLayout.LEADING));
        actions.add(transfer); actions.add(open); actions.add(cleanup);
        var bottom = new JPanel(new BorderLayout());
        bottom.add(actions, BorderLayout.NORTH); bottom.add(status, BorderLayout.SOUTH);
        panel.add(bottom, BorderLayout.SOUTH);
        choose.addActionListener(e -> scanFolder());
        transfer.addActionListener(e -> transfer());
        cleanup.addActionListener(e -> cleanup());
        open.addActionListener(e -> {
            try { Desktop.getDesktop().open(batch.toFile()); }
            catch (Exception ex) { JOptionPane.showMessageDialog(frame, "Open this folder: " + batch); }
        });
        files.addListSelectionListener(e -> { if (choose.isEnabled()) buttons(true); });
        frame.setContentPane(panel);
        frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        frame.setSize(850, 500);
        frame.setLocationByPlatform(true);
        buttons(true);
        frame.setVisible(true);
    }
    public static void main(String[] args) throws Exception {
        if (args.length == 1 && args[0].equals("--smoke-test")) {
            SwingUtilities.invokeAndWait(() -> {
                SpaceFix app = new SpaceFix();
                try {
                    app.show();
                    if (!app.frame.isShowing()) throw new IllegalStateException("Window failed to open");
                } finally {
                    app.frame.dispose();
                }
            });
            return;
        }
        SwingUtilities.invokeLater(() -> new SpaceFix().show());
    }
}
