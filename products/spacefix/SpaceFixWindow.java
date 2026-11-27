import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.IOException;
import java.nio.file.*;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.Consumer;
import javax.swing.*;
import javax.swing.border.*;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import javax.swing.plaf.basic.BasicButtonUI;
import javax.swing.table.AbstractTableModel;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.TableRowSorter;

/** Deliberately sharp, light-only neo-brutalist desktop UI. All IO stays off the EDT. */
final class SpaceFixWindow {
    static final Color INK = new Color(17, 17, 16);
    static final Color PAPER = new Color(246, 245, 239);
    static final Color WHITE = new Color(255, 254, 249);
    static final Color YELLOW = new Color(255, 223, 112);
    static final Color BLUE = new Color(203, 220, 255);
    static final Color CORAL = new Color(255, 195, 177);
    static final Color GREY = new Color(230, 228, 221);
    static final Color MUTED = new Color(75, 74, 69);
    static final Font DISPLAY = new Font("SansSerif", Font.BOLD, 28);
    static final Font BODY = new Font("SansSerif", Font.PLAIN, 13);
    static final Font MONO = new Font("Monospaced", Font.BOLD, 11);
    static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy");

    final JFrame frame = new JFrame("Cellar SpaceFix | Smart Storage Review");
    final FileTableModel model = new FileTableModel();
    final JTable table = new JTable(model);
    final TableRowSorter<FileTableModel> sorter = new TableRowSorter<>(model);
    final JLabel status = new JLabel("READY  /  Choose a personal folder to begin. Nothing is changed by scanning.");
    final JLabel countStat = statValue("0");
    final JLabel suggestedStat = statValue("0");
    final JLabel sizeStat = statValue("0 B");
    final JLabel duplicatesStat = statValue("0");
    final JTextArea details = new JTextArea("Select a row for a plain-language explanation of the recommendation.\n\nSpaceFix works locally and never uploads file names.");
    final JTextField search = new JTextField(17);
    final JComboBox<String> filter = new JComboBox<>(new String[]{"All files", "Suggestions", "Matched duplicates", "Large files"});
    final JButton scan = button("SCAN A FOLDER", YELLOW);
    final JButton suggestions = button("SELECT SUGGESTIONS", WHITE);
    final JButton transfer = button("COPY + VERIFY", BLUE);
    final JButton open = button("OPEN COPIES", WHITE);
    final JButton cleanup = button("REVIEW RECYCLE", CORAL);
    final JProgressBar progress = new JProgressBar();
    List<SpaceFix.Item> items = List.of();
    List<SpaceFix.Item> verified = List.of();
    Path source;
    Path batch;
    boolean busy;

    SpaceFixWindow() {
        frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        frame.setMinimumSize(new Dimension(1000, 680));
        frame.setSize(new Dimension(1260, 780));
        frame.setLocationRelativeTo(null);
        frame.getContentPane().setBackground(PAPER);
        frame.setContentPane(build());
        wire();
        buttons();
    }

    void show() { frame.setVisible(true); }

    private JPanel build() {
        var root = panel(PAPER, new BorderLayout(0, 15));
        root.setBorder(BorderFactory.createEmptyBorder(18, 20, 16, 20));

        var header = panel(PAPER, new BorderLayout());
        header.add(label("CELLAR STUDIO    /    SOFTWARE DIVISION", MONO, MUTED), BorderLayout.WEST);
        header.add(label("SPACEFIX   ·   LOCAL INTELLIGENCE   ·   V1.1", MONO, INK), BorderLayout.EAST);
        header.setBorder(new MatteBorder(0, 0, 2, 0, INK));

        var hero = panel(PAPER, new BorderLayout(24, 0));
        var heroCopy = panel(PAPER, new GridLayout(2, 1, 0, 2));
        heroCopy.add(label("MAKE ROOM. KEEP CONTROL.", new Font("SansSerif", Font.BOLD, 34), INK));
        heroCopy.add(label("Smart, offline file review. Verified transfers. No surprise deletions.", BODY, MUTED));
        hero.add(heroCopy, BorderLayout.CENTER);
        hero.add(scan, BorderLayout.EAST);
        hero.setBorder(BorderFactory.createEmptyBorder(8, 0, 4, 0));

        var metrics = panel(PAPER, new GridLayout(1, 4, 13, 0));
        metrics.add(metric("01  /  FILES REVIEWED", countStat, WHITE));
        metrics.add(metric("02  /  SUGGESTIONS", suggestedStat, YELLOW));
        metrics.add(metric("03  /  TO REVIEW", sizeStat, BLUE));
        metrics.add(metric("04  /  VERIFIED MATCHES", duplicatesStat, GREY));

        var top = panel(PAPER, new BorderLayout(0, 14));
        top.add(header, BorderLayout.NORTH);
        top.add(hero, BorderLayout.CENTER);
        top.add(metrics, BorderLayout.SOUTH);
        root.add(top, BorderLayout.NORTH);

        var data = panel(WHITE, new BorderLayout(0, 8));
        data.setBorder(blockBorder());
        var dataHeader = panel(WHITE, new BorderLayout(10, 8));
        dataHeader.setBorder(BorderFactory.createEmptyBorder(14, 14, 10, 14));
        var heading = label("FILE REVIEW", new Font("SansSerif", Font.BOLD, 19), INK);
        dataHeader.add(heading, BorderLayout.WEST);
        var tools = panel(WHITE, new FlowLayout(FlowLayout.RIGHT, 8, 0));
        search.setFont(BODY);
        search.setToolTipText("Filter by file name or folder");
        search.setBorder(BorderFactory.createCompoundBorder(new LineBorder(INK, 2),
                BorderFactory.createEmptyBorder(8, 10, 8, 10)));
        filter.setFont(BODY);
        filter.setBackground(WHITE);
        filter.setBorder(new LineBorder(INK, 1));
        tools.add(label("FIND", MONO, MUTED)); tools.add(search); tools.add(filter);
        dataHeader.add(tools, BorderLayout.EAST);
        data.add(dataHeader, BorderLayout.NORTH);

        table.setRowHeight(41);
        table.setFont(BODY);
        table.setForeground(INK);
        table.setBackground(WHITE);
        table.setSelectionBackground(BLUE);
        table.setSelectionForeground(INK);
        table.setGridColor(GREY);
        table.setShowVerticalLines(false);
        table.setShowHorizontalLines(true);
        table.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
        table.setFillsViewportHeight(true);
        table.getTableHeader().setReorderingAllowed(false);
        table.getTableHeader().setPreferredSize(new Dimension(100, 36));
        table.getTableHeader().setFont(MONO);
        table.getTableHeader().setForeground(INK);
        table.getTableHeader().setBackground(GREY);
        table.setRowSorter(sorter);
        sorter.setSortKeys(List.of(new RowSorter.SortKey(5, SortOrder.DESCENDING)));
        table.getColumnModel().getColumn(0).setPreferredWidth(255);
        table.getColumnModel().getColumn(1).setPreferredWidth(90);
        table.getColumnModel().getColumn(2).setPreferredWidth(105);
        table.getColumnModel().getColumn(3).setPreferredWidth(103);
        table.getColumnModel().getColumn(4).setPreferredWidth(112);
        table.getColumnModel().getColumn(5).setPreferredWidth(68);
        var renderer = new FileRenderer();
        for (int i = 0; i < table.getColumnCount(); i++) table.getColumnModel().getColumn(i).setCellRenderer(renderer);
        table.getAccessibleContext().setAccessibleDescription("Files for manual review, sorted by recommendation priority. Select one or several rows.");
        var scroll = new JScrollPane(table);
        scroll.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        scroll.getViewport().setBackground(WHITE);
        data.add(scroll, BorderLayout.CENTER);

        var side = panel(BLUE, new BorderLayout(0, 12));
        side.setBorder(blockBorder());
        var sideHead = panel(BLUE, new GridLayout(2, 1, 0, 5));
        sideHead.add(label("SMART INSIGHTS", new Font("SansSerif", Font.BOLD, 19), INK));
        sideHead.add(label("ON-DEVICE  /  EXPLAINABLE  /  PRIVATE", MONO, MUTED));
        sideHead.setBorder(BorderFactory.createEmptyBorder(16, 18, 12, 18));
        side.add(sideHead, BorderLayout.NORTH);
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setEditable(false);
        details.setFocusable(false);
        details.setBackground(BLUE);
        details.setForeground(INK);
        details.setFont(new Font("SansSerif", Font.PLAIN, 14));
        details.setMargin(new Insets(10, 18, 12, 18));
        side.add(new JScrollPane(details, JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED,
                JScrollPane.HORIZONTAL_SCROLLBAR_NEVER) {{ setBorder(null); getViewport().setBackground(BLUE); }}, BorderLayout.CENTER);
        var note = label("NO AUTO-CLEAN  ·  YOU APPROVE EVERY STEP", MONO, INK);
        note.setBorder(BorderFactory.createEmptyBorder(12, 14, 16, 14));
        side.add(note, BorderLayout.SOUTH);

        var main = panel(PAPER, new BorderLayout(14, 0));
        main.add(data, BorderLayout.CENTER);
        side.setPreferredSize(new Dimension(307, 100));
        main.add(side, BorderLayout.EAST);
        root.add(main, BorderLayout.CENTER);

        var footer = panel(PAPER, new BorderLayout(0, 12));
        var actions = panel(PAPER, new FlowLayout(FlowLayout.LEFT, 10, 0));
        actions.add(suggestions); actions.add(transfer); actions.add(open); actions.add(cleanup);
        footer.add(actions, BorderLayout.NORTH);
        var statusRow = panel(PAPER, new BorderLayout(8, 0));
        status.setFont(MONO);
        status.setForeground(MUTED);
        statusRow.add(status, BorderLayout.CENTER);
        progress.setIndeterminate(true);
        progress.setVisible(false);
        progress.setPreferredSize(new Dimension(130, 14));
        statusRow.add(progress, BorderLayout.EAST);
        footer.add(statusRow, BorderLayout.SOUTH);
        root.add(footer, BorderLayout.SOUTH);
        return root;
    }

    private static JPanel panel(Color color, LayoutManager layout) {
        var result = new JPanel(layout);
        result.setOpaque(true);
        result.setBackground(color);
        return result;
    }

    private static Border blockBorder() {
        return BorderFactory.createCompoundBorder(new MatteBorder(0, 0, 5, 5, INK), new LineBorder(INK, 3));
    }

    private static JLabel label(String text, Font font, Color color) {
        var l = new JLabel(text); l.setFont(font); l.setForeground(color); return l;
    }

    private static JLabel statValue(String text) { return label(text, DISPLAY, INK); }

    private static JPanel metric(String title, JLabel value, Color color) {
        var block = panel(color, new GridLayout(2, 1, 0, 5));
        block.setBorder(BorderFactory.createCompoundBorder(blockBorder(),
                BorderFactory.createEmptyBorder(10, 14, 10, 14)));
        block.add(label(title, MONO, MUTED)); block.add(value);
        return block;
    }

    private static JButton button(String text, Color background) {
        var b = new JButton(text);
        b.setUI(new BasicButtonUI());
        b.setOpaque(true);
        b.setBackground(background);
        b.setForeground(INK);
        b.setFont(MONO);
        b.setFocusPainted(true);
        b.setPreferredSize(new Dimension(Math.max(142, text.length() * 9 + 28), 46));
        b.setBorder(BorderFactory.createCompoundBorder(new LineBorder(INK, 3),
                BorderFactory.createEmptyBorder(8, 10, 8, 10)));
        b.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        b.addMouseListener(new MouseAdapter() {
            @Override public void mouseEntered(MouseEvent e) { if (b.isEnabled()) b.setBackground(GREY); }
            @Override public void mouseExited(MouseEvent e) { b.setBackground(background); }
        });
        return b;
    }

    private void wire() {
        scan.addActionListener(e -> chooseFolder());
        suggestions.addActionListener(e -> selectSuggestions());
        transfer.addActionListener(e -> transfer());
        open.addActionListener(e -> openCopies());
        cleanup.addActionListener(e -> cleanup());
        table.getSelectionModel().addListSelectionListener(e -> { if (!e.getValueIsAdjusting()) selectionChanged(); });
        filter.addActionListener(e -> applyFilter());
        search.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { applyFilter(); }
            public void removeUpdate(DocumentEvent e) { applyFilter(); }
            public void changedUpdate(DocumentEvent e) { applyFilter(); }
        });
    }

    private void buttons() {
        boolean selected = !table.getSelectionModel().isSelectionEmpty();
        scan.setEnabled(!busy);
        suggestions.setEnabled(!busy && items.stream().anyMatch(SpaceFix.Item::suggested));
        transfer.setEnabled(!busy && selected);
        cleanup.setEnabled(!busy && !verified.isEmpty() && SpaceFix.canRecycle());
        open.setEnabled(!busy && batch != null);
        table.setEnabled(!busy);
    }

    private void applyFilter() {
        String needle = search.getText().strip().toLowerCase(Locale.ROOT);
        int mode = filter.getSelectedIndex();
        sorter.setRowFilter(new RowFilter<>() {
            @Override public boolean include(Entry<? extends FileTableModel, ? extends Integer> entry) {
                SpaceFix.Item item = items.get(entry.getIdentifier());
                return item.relativeName().toLowerCase(Locale.ROOT).contains(needle)
                        && (mode == 0 || (mode == 1 && item.suggested())
                        || (mode == 2 && item.duplicate()) || (mode == 3 && item.size() >= 250L * 1024 * 1024));
            }
        });
        selectionChanged();
    }

    private List<SpaceFix.Item> selected() {
        var result = new ArrayList<SpaceFix.Item>();
        for (int row : table.getSelectedRows()) result.add(items.get(table.convertRowIndexToModel(row)));
        return List.copyOf(result);
    }

    private void selectSuggestions() {
        filter.setSelectedIndex(0);
        search.setText("");
        table.clearSelection();
        for (int row = 0; row < table.getRowCount(); row++) {
            if (items.get(table.convertRowIndexToModel(row)).suggested()) table.addRowSelectionInterval(row, row);
        }
        selectionChanged();
    }

    private void selectionChanged() {
        var chosen = selected();
        if (chosen.isEmpty()) {
            details.setText("Select a file to see why it was highlighted.\n\n"
                    + "Scores use size, age, file type and verified same-content matches. This is transparent local analysis, not a cloud AI service.\n\n"
                    + "Only your choices can start a transfer or move an original to the Recycle Bin.");
        } else if (chosen.size() == 1) {
            var item = chosen.getFirst();
            details.setText(item.relativeName() + "\n\n" + formatSize(item.size()) + "  ·  " + item.type()
                    + "  ·  SCORE " + item.score() + "/100\n\n" + item.insight()
                    + "\n\nScanning only reads metadata and, for potential duplicates, file contents."
                    + " Moving a file always requires your confirmation.");
        } else {
            long bytes = chosen.stream().mapToLong(SpaceFix.Item::size).sum();
            details.setText(chosen.size() + " FILES SELECTED\n\n" + formatSize(bytes)
                    + " planned for copy and verification.\n\nNothing has been copied or deleted yet."
                    + "\n\nReview the selected files and choose COPY + VERIFY when ready.");
        }
        details.setCaretPosition(0);
        buttons();
    }

    private Path folder(String title) {
        var picker = new JFileChooser();
        picker.setDialogTitle(title);
        picker.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        Path downloads = Path.of(System.getProperty("user.home"), "Downloads");
        if (Files.isDirectory(downloads)) picker.setCurrentDirectory(downloads.toFile());
        return picker.showOpenDialog(frame) == JFileChooser.APPROVE_OPTION
                ? picker.getSelectedFile().toPath().toAbsolutePath() : null;
    }

    private void chooseFolder() {
        Path chosen = folder("Choose a personal folder — not a system folder");
        if (chosen == null) return;
        runTask("SCANNING  /  Reading visible personal files and comparing possible duplicates…",
                () -> SpaceFix.scan(chosen), found -> {
                    source = chosen;
                    batch = null;
                    verified = List.of();
                    items = found;
                    model.fireTableDataChanged();
                    refreshStats();
                    status.setText("READY  /  " + found.size() + " files reviewed. Nothing was changed.");
                    selectionChanged();
                });
    }

    private void refreshStats() {
        var recommended = items.stream().filter(SpaceFix.Item::suggested).toList();
        countStat.setText(String.format("%,d", items.size()));
        suggestedStat.setText(String.format("%,d", recommended.size()));
        sizeStat.setText(formatSize(recommended.stream().mapToLong(SpaceFix.Item::size).sum()));
        duplicatesStat.setText(String.valueOf(items.stream().filter(SpaceFix.Item::duplicate).count()));
    }

    private <T> void runTask(String message, Callable<T> job, Consumer<T> success) {
        busy = true;
        status.setText(message);
        progress.setVisible(true);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        buttons();
        new SwingWorker<T, Void>() {
            @Override protected T doInBackground() throws Exception { return job.call(); }
            @Override protected void done() {
                try { success.accept(get()); }
                catch (Exception e) {
                    Throwable error = e.getCause() == null ? e : e.getCause();
                    status.setText("STOPPED  /  No automatic cleanup was performed. Review details before retrying.");
                    JOptionPane.showMessageDialog(frame, error.getMessage(), "SpaceFix · operation stopped", JOptionPane.ERROR_MESSAGE);
                } finally {
                    busy = false;
                    progress.setVisible(false);
                    frame.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
                    buttons();
                }
            }
        }.execute();
    }

    private void transfer() {
        var chosen = selected();
        if (chosen.isEmpty()) return;
        Path dest = folder("Choose a destination on a DIFFERENT drive");
        if (dest == null) return;
        long bytes = chosen.stream().mapToLong(SpaceFix.Item::size).sum();
        String message = "Copy " + chosen.size() + " selected files (" + formatSize(bytes) + ") to " + dest
                + "?\n\nSpaceFix will verify every copy. Originals remain untouched after this step.";
        if (JOptionPane.showConfirmDialog(frame, message, "Confirm verified copy", JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.QUESTION_MESSAGE) != JOptionPane.OK_OPTION) return;
        verified = List.of(); batch = null;
        runTask("COPYING  /  Comparing every destination file byte for byte…",
                () -> SpaceFix.transferBatch(chosen, dest, bytes), dir -> {
                    batch = dir;
                    verified = chosen;
                    status.setText("VERIFIED  /  " + chosen.size() + " copies are ready. Open them before recycling originals.");
                });
    }

    private void openCopies() {
        if (batch == null) return;
        try { Desktop.getDesktop().open(batch.toFile()); }
        catch (Exception e) { JOptionPane.showMessageDialog(frame, "Open this folder to review your copies:\n" + batch); }
    }

    private void cleanup() {
        if (verified.isEmpty() || batch == null || !SpaceFix.canRecycle()) return;
        var chosen = verified;
        StringBuilder paths = new StringBuilder();
        chosen.stream().limit(20).forEach(item -> paths.append("• ").append(item.relativeName()).append('\n'));
        if (chosen.size() > 20) paths.append("…and ").append(chosen.size() - 20).append(" more.\n");
        String message = "Move these ORIGINALS to the Recycle Bin?\n\n" + paths
                + "\nAll copies will be checked again first. Empty the Recycle Bin yourself to reclaim space.";
        if (JOptionPane.showConfirmDialog(frame, message, "Review originals · separate confirmation",
                JOptionPane.OK_CANCEL_OPTION, JOptionPane.WARNING_MESSAGE) != JOptionPane.OK_OPTION) return;
        Path dir = batch;
        verified = List.of();
        runTask("RECHECKING  /  Re-verifying each copy before recycling…", () -> {
            int recycled = 0;
            for (SpaceFix.Item item : chosen) {
                try {
                    Path copy = dir.resolve(item.root().relativize(item.path()));
                    SpaceFix.verify(item.path(), copy);
                    if (!Desktop.getDesktop().moveToTrash(item.path().toFile()))
                        throw new IOException("Recycle Bin did not accept " + item.relativeName());
                    recycled++;
                } catch (IOException | RuntimeException ex) {
                    throw new IOException(recycled + " originals recycled before stopping. " + ex.getMessage(), ex);
                }
            }
            return recycled;
        }, count -> {
            items = items.stream().filter(item -> !chosen.contains(item)).toList();
            model.fireTableDataChanged();
            refreshStats();
            status.setText("RECYCLED  /  " + count + " originals. Empty the Recycle Bin separately to free space.");
        });
    }

    private static String formatSize(long size) {
        if (size < 1024) return size + " B";
        double value = size;
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int index = 0;
        while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
        return String.format(Locale.ROOT, "%.1f %s", value, units[index]);
    }

    private final class FileTableModel extends AbstractTableModel {
        private final String[] columns = {"FILE / LOCATION", "SIZE", "TYPE", "MODIFIED", "SIGNAL", "SCORE"};
        @Override public int getRowCount() { return items.size(); }
        @Override public int getColumnCount() { return columns.length; }
        @Override public String getColumnName(int column) { return columns[column]; }
        @Override public Class<?> getColumnClass(int column) {
            return column == 1 ? Long.class : column == 5 ? Integer.class : String.class;
        }
        @Override public Object getValueAt(int row, int column) {
            var item = items.get(row);
            return switch (column) {
                case 0 -> item.relativeName();
                case 1 -> item.size();
                case 2 -> item.type();
                case 3 -> DATE.format(item.modified().atZone(ZoneId.systemDefault()));
                case 4 -> item.duplicate() ? "MATCHED" : item.suggested() ? "REVIEW" : "KEEP / CHECK";
                case 5 -> item.score();
                default -> "";
            };
        }
    }

    private final class FileRenderer extends DefaultTableCellRenderer {
        @Override public Component getTableCellRendererComponent(JTable list, Object value, boolean selected,
                boolean focused, int row, int column) {
            var cell = (JLabel) super.getTableCellRendererComponent(list, value, selected, focused, row, column);
            var item = items.get(list.convertRowIndexToModel(row));
            cell.setFont(column == 4 || column == 5 ? MONO : BODY);
            cell.setBorder(BorderFactory.createEmptyBorder(2, 10, 2, 8));
            cell.setBackground(selected ? BLUE : row % 2 == 0 ? WHITE : PAPER);
            cell.setForeground(column == 4 && item.score() >= 60 ? new Color(99, 63, 8) : INK);
            if (column == 1) cell.setText(formatSize((Long) value));
            if (column == 5) cell.setHorizontalAlignment(SwingConstants.CENTER);
            else cell.setHorizontalAlignment(SwingConstants.LEFT);
            cell.setToolTipText(item.path().toString());
            return cell;
        }
    }
}
