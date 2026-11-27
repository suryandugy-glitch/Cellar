import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
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


    // ---- Brutalist look: flat colour, thick black borders, hard offset shadows, monospace type ----
    static final Color INK = Color.BLACK, PAPER = new Color(0xF2EFE6), YELLOW = new Color(0xFFE000),
            RED = new Color(0xFF3B2F), MUTED = new Color(0x9A9686);
    static final int SHADOW = 6, EDGE = 4;
    static Font mono(int style, float size) { return new Font(Font.MONOSPACED, style, 1).deriveFont(style, size); }

    static String human(long bytes) {
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        double v = bytes;
        int u = 0;
        while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
        return u == 0 ? bytes + " B" : String.format("%.1f %s", v, units[u]);
    }

    static void style() {
        try { UIManager.setLookAndFeel(UIManager.getCrossPlatformLookAndFeelClassName()); } catch (Exception ignored) {}
        var edge = BorderFactory.createLineBorder(INK, 3);
        var padded = BorderFactory.createCompoundBorder(edge, BorderFactory.createEmptyBorder(6, 14, 6, 14));
        for (String key : new String[]{"Panel.background", "OptionPane.background", "FileChooser.background",
                "ScrollPane.background", "Viewport.background", "List.background", "TextField.background"})
            UIManager.put(key, key.startsWith("List") || key.startsWith("TextField") ? Color.WHITE : PAPER);
        UIManager.put("Button.background", YELLOW);
        UIManager.put("Button.foreground", INK);
        UIManager.put("Button.border", padded);
        UIManager.put("Button.font", mono(Font.BOLD, 13f));
        UIManager.put("Button.select", Color.WHITE);
        UIManager.put("Button.focus", INK);
        for (String key : new String[]{"Label.font", "OptionPane.messageFont", "OptionPane.buttonFont", "List.font",
                "TextField.font", "ComboBox.font", "Table.font", "Tree.font"})
            UIManager.put(key, mono(Font.BOLD, 13f));
        UIManager.put("Label.foreground", INK);
        UIManager.put("OptionPane.messageForeground", INK);
        UIManager.put("List.selectionBackground", INK);
        UIManager.put("List.selectionForeground", YELLOW);
    }

    /** Flat button: black frame, hard shadow that collapses when pressed, inverted on hover. */
    static final class Block extends JButton {
        boolean hover;
        Block(String label) {
            super(label);
            setContentAreaFilled(false);
            setBorderPainted(false);
            setFocusPainted(false);
            setOpaque(false);
            setFont(mono(Font.BOLD, 13f));
            setMargin(new Insets(0, 0, 0, 0));
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            addMouseListener(new MouseAdapter() {
                public void mouseEntered(MouseEvent e) { hover = true; repaint(); }
                public void mouseExited(MouseEvent e) { hover = false; repaint(); }
            });
        }
        public Dimension getPreferredSize() {
            var fm = getFontMetrics(getFont());
            return new Dimension(fm.stringWidth(getText()) + 44, 46 + SHADOW);
        }
        protected void paintComponent(Graphics g0) {
            var g = (Graphics2D) g0.create();
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            int w = getWidth() - SHADOW, h = getHeight() - SHADOW;
            boolean on = isEnabled(), down = on && getModel().isPressed();
            int o = down ? SHADOW : 0;
            if (on && !down) { g.setColor(INK); g.fillRect(SHADOW, SHADOW, w, h); }
            g.setColor(!on ? new Color(0xD8D4C6) : hover ? INK : YELLOW);
            g.fillRect(o, o, w, h);
            g.setColor(on ? INK : MUTED);
            g.setStroke(new BasicStroke(3));
            g.drawRect(o + 1, o + 1, w - 3, h - 3);
            g.setFont(getFont());
            g.setColor(!on ? MUTED : hover ? YELLOW : INK);
            var fm = g.getFontMetrics();
            g.drawString(getText(), o + (w - fm.stringWidth(getText())) / 2, o + (h + fm.getAscent() - fm.getDescent()) / 2);
            g.dispose();
        }
    }

    /** Container that draws a hard offset shadow and thick frame around its child. */
    static final class Slab extends JPanel {
        final Color face;
        Slab(Color face, LayoutManager layout) {
            super(layout);
            this.face = face;
            setOpaque(false);
            setBorder(BorderFactory.createEmptyBorder(EDGE + 6, EDGE + 10, EDGE + SHADOW + 6, EDGE + SHADOW + 10));
        }
        protected void paintComponent(Graphics g) {
            int w = getWidth() - SHADOW, h = getHeight() - SHADOW;
            g.setColor(INK); g.fillRect(SHADOW, SHADOW, w, h);
            g.setColor(face); g.fillRect(0, 0, w, h);
            g.setColor(INK); g.fillRect(0, 0, w, EDGE); g.fillRect(0, h - EDGE, w, EDGE);
            g.fillRect(0, 0, EDGE, h); g.fillRect(w - EDGE, 0, EDGE, h);
        }
    }

    /** One numbered stage in the three-step strip. */
    static final class Step extends JLabel {
        boolean active;
        Step(String text) {
            super(text, SwingConstants.CENTER);
            setFont(mono(Font.BOLD, 12f));
            setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(INK, 3),
                    BorderFactory.createEmptyBorder(8, 10, 8, 10)));
            setOpaque(true);
            light(false);
        }
        void light(boolean on) {
            active = on;
            setBackground(on ? INK : Color.WHITE);
            setForeground(on ? YELLOW : INK);
        }
    }

    static final class Row extends DefaultListCellRenderer {
        public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean sel, boolean focus) {
            var item = (Item) value;
            var c = (JLabel) super.getListCellRendererComponent(list, "", index, sel, false);
            c.setText(String.format("%10s   %s", human(item.size()), item.path()));
            c.setFont(mono(Font.BOLD, 13f));
            c.setBorder(BorderFactory.createCompoundBorder(
                    BorderFactory.createMatteBorder(0, 0, 2, 0, INK), BorderFactory.createEmptyBorder(8, 10, 8, 10)));
            c.setBackground(sel ? INK : index % 2 == 0 ? Color.WHITE : PAPER);
            c.setForeground(sel ? YELLOW : INK);
            return c;
        }
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

    final JFrame frame = new JFrame("SPACEFIX — Cellar Studio");
    final DefaultListModel<Item> model = new DefaultListModel<>();
    final JList<Item> files = new JList<>(model);
    final JLabel count = new JLabel("0 FILES");
    final Step[] steps = {new Step("1  PICK FOLDER"), new Step("2  COPY + VERIFY"), new Step("3  RECYCLE ORIGINALS")};
    final JLabel status = new JLabel("CHOOSE A PERSONAL FOLDER, SUCH AS DOWNLOADS OR VIDEOS.");
    final JButton choose = new Block("1  CHOOSE FOLDER");
    final JButton transfer = new Block("2  COPY TO OTHER DRIVE");
    final JButton cleanup = new Block("3  RECYCLE ORIGINALS");
    final JButton open = new Block("OPEN COPIES");
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
        count.setText(model.size() + " FILES" + (files.getSelectedIndices().length > 0
                ? "  /  " + files.getSelectedIndices().length + " PICKED" : ""));
        steps[0].light(model.isEmpty());
        steps[1].light(!model.isEmpty() && verified.isEmpty());
        steps[2].light(!verified.isEmpty());
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
            status.setText(items.isEmpty() ? "No visible files here. Choose a folder containing your files."
                    : items.size() + " files in " + source + " — select files to copy.");
        });
    }

    void transfer() {
        var selected = List.copyOf(files.getSelectedValuesList());
        Path destination = folder("Choose a folder on another drive");
        if (selected.isEmpty() || destination == null) return;
        long bytes = selected.stream().mapToLong(Item::size).sum();
        if (JOptionPane.showConfirmDialog(frame, String.format("COPY %d FILES (%s) TO %s?",
                selected.size(), human(bytes), destination), "Confirm copy", JOptionPane.OK_CANCEL_OPTION)
                != JOptionPane.OK_OPTION) return;
        verified = List.of();
        batch = null;
        work("Copying files and comparing their contents…", () -> {
            return transferBatch(selected, destination, bytes);
        }, dir -> {
            batch = dir;
            verified = selected;
            status.setText("Verified " + selected.size() + " copies. Open copies to inspect them before cleanup.");
        });
    }

    static Path transferBatch(List<Item> selected, Path destination, long bytes) throws IOException {
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
        style();
        files.setCellRenderer(new Row());
        var root = new JPanel(new BorderLayout(0, 18));
        root.setBackground(PAPER);
        root.setBorder(BorderFactory.createEmptyBorder(22, 24, 18, 24));

        var title = new JLabel("SPACEFIX");
        title.setFont(mono(Font.BOLD, 46f));
        var tag = new JLabel("<html>FREE UP DRIVE SPACE.<br>COPY. VERIFY BYTE FOR BYTE. THEN RECYCLE.</html>");
        tag.setFont(mono(Font.BOLD, 13f));
        var head = new Slab(YELLOW, new BorderLayout(24, 0));
        head.add(title, BorderLayout.WEST);
        head.add(tag, BorderLayout.CENTER);
        var strip = new JPanel(new GridLayout(1, 3, 10, 0));
        strip.setOpaque(false);
        for (var step : steps) strip.add(step);
        var north = new JPanel(new BorderLayout(0, 10));
        north.setOpaque(false);
        north.add(head, BorderLayout.CENTER);
        north.add(strip, BorderLayout.SOUTH);
        root.add(north, BorderLayout.NORTH);

        var listCard = new Slab(Color.WHITE, new BorderLayout(0, 8));
        count.setFont(mono(Font.BOLD, 12f));
        var caption = new JLabel("LARGEST FILES FIRST  ·  CTRL / SHIFT TO MULTI-SELECT");
        caption.setFont(mono(Font.BOLD, 12f));
        var listTop = new JPanel(new BorderLayout());
        listTop.setOpaque(false);
        listTop.add(caption, BorderLayout.WEST);
        listTop.add(count, BorderLayout.EAST);
        listCard.add(listTop, BorderLayout.NORTH);
        var scroll = new JScrollPane(files);
        scroll.setBorder(BorderFactory.createLineBorder(INK, 3));
        listCard.add(scroll, BorderLayout.CENTER);
        root.add(listCard, BorderLayout.CENTER);

        var actions = new JPanel(new FlowLayout(FlowLayout.LEADING, 14, 0));
        actions.setOpaque(false);
        actions.add(choose); actions.add(transfer); actions.add(open); actions.add(cleanup);
        status.setFont(mono(Font.BOLD, 12f));
        status.setForeground(YELLOW);
        status.setOpaque(true);
        status.setBackground(INK);
        status.setBorder(BorderFactory.createEmptyBorder(10, 14, 10, 14));
        var bottom = new JPanel(new BorderLayout(0, 12));
        bottom.setOpaque(false);
        bottom.add(actions, BorderLayout.NORTH);
        bottom.add(status, BorderLayout.SOUTH);
        root.add(bottom, BorderLayout.SOUTH);

        choose.addActionListener(e -> scanFolder());
        transfer.addActionListener(e -> transfer());
        cleanup.addActionListener(e -> cleanup());
        open.addActionListener(e -> {
            try { Desktop.getDesktop().open(batch.toFile()); }
            catch (Exception ex) { JOptionPane.showMessageDialog(frame, "Open this folder: " + batch); }
        });
        files.addListSelectionListener(e -> { if (choose.isEnabled()) buttons(true); });
        frame.setContentPane(root);
        frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        frame.setMinimumSize(new Dimension(900, 560));
        frame.setSize(1000, 660);
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
