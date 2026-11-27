import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import static java.nio.file.FileVisitResult.*;
import static java.nio.file.LinkOption.NOFOLLOW_LINKS;

/**
 * Offline, explainable storage recommendations. No network, telemetry, AI API,
 * filesystem mutation or automatic deletion. Duplicate matches use full SHA-256.
 */
final class SmartScanner {
    private static final int MAX_DEPTH = 7;
    private static final int MAX_FILES = 25_000;
    private static final int MAX_HASHED_FILES = 80;
    private static final long MAX_HASH_BYTES = 256L * 1024 * 1024;
    private static final long MIB = 1024L * 1024;
    private static final Set<String> BLOCKED_DIRS = Set.of(
            "windows", "program files", "program files (x86)", "programdata",
            "appdata", "system volume information", "$recycle.bin", "recovery",
            ".git", ".svn", "node_modules", ".cache", "onedrive");
    private static final Set<String> PROTECTED = Set.of(
            "exe", "msi", "msix", "dll", "sys", "bat", "cmd", "ps1", "sh", "jar",
            "db", "sqlite", "sqlite3", "pst", "ost", "pem", "key", "env", "vhd", "vhdx");
    private static final Set<String> ARCHIVE = Set.of("zip", "7z", "rar", "tar", "gz", "iso", "img");
    private static final Set<String> MEDIA = Set.of("mp4", "mkv", "mov", "avi", "webm", "mp3", "wav", "flac");
    private static final Set<String> DOCUMENT = Set.of("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx");

    private SmartScanner() {}

    static List<SpaceFix.Item> scan(Path directory) throws IOException {
        Path root = directory.toAbsolutePath().normalize().toRealPath(NOFOLLOW_LINKS);
        if (!Files.isDirectory(root, NOFOLLOW_LINKS) || root.getParent() == null
                || root.equals(Path.of(System.getProperty("user.home")).toAbsolutePath().normalize())
                || containsBlockedSegment(root))
            throw new IOException("Choose a personal folder inside Downloads, Documents or Videos — not a system or drive root.");

        var found = new ArrayList<Raw>();
        boolean[] limit = { false };
        Files.walkFileTree(root, EnumSet.noneOf(FileVisitOption.class), MAX_DEPTH,
            new SimpleFileVisitor<>() {
                @Override public FileVisitResult preVisitDirectory(Path path, BasicFileAttributes attrs) {
                    if (!path.equals(root) && (attrs.isSymbolicLink() || !attrs.isDirectory()
                            || containsBlockedSegment(path) || hidden(path))) return SKIP_SUBTREE;
                    return CONTINUE;
                }
                @Override public FileVisitResult visitFile(Path path, BasicFileAttributes attrs) {
                    if (found.size() >= MAX_FILES) { limit[0] = true; return TERMINATE; }
                    if (attrs.isRegularFile() && !attrs.isSymbolicLink() && !hidden(path))
                        found.add(new Raw(path, attrs.size(), attrs.lastModifiedTime().toInstant()));
                    return CONTINUE;
                }
                @Override public FileVisitResult visitFileFailed(Path path, IOException error) {
                    // Permissions and busy files must not break an otherwise safe preview.
                    return CONTINUE;
                }
            });
        if (limit[0]) throw new IOException("This folder contains over 25,000 visible files. Choose a smaller personal folder.");

        var bySize = new HashMap<Long, List<Raw>>();
        for (Raw raw : found) {
            if (raw.size > 0 && raw.size <= MAX_HASH_BYTES && !protectedType(raw.path))
                bySize.computeIfAbsent(raw.size, ignored -> new ArrayList<>()).add(raw);
        }
        var duplicates = new HashMap<Path, Path>();
        int hashed = 0;
        for (var group : bySize.values()) {
            if (group.size() < 2) continue;
            var seen = new HashMap<String, Path>();
            for (Raw raw : group) {
                if (++hashed > MAX_HASHED_FILES) break;
                try {
                    var key = digest(raw.path);
                    Path first = seen.putIfAbsent(key, raw.path);
                    if (first != null) duplicates.put(raw.path, first);
                } catch (IOException ignored) {
                    // Unreadable files cannot be certified as duplicates.
                }
            }
            if (hashed > MAX_HASHED_FILES) break;
        }

        var result = new ArrayList<SpaceFix.Item>();
        Instant now = Instant.now();
        for (Raw raw : found) {
            boolean sameContent = duplicates.containsKey(raw.path);
            boolean protectedFile = protectedType(raw.path);
            String extension = extension(raw.path);
            String type = PROTECTED.contains(extension) ? "Protected type" : ARCHIVE.contains(extension) ? "Archive"
                    : MEDIA.contains(extension) ? "Media" : DOCUMENT.contains(extension) ? "Document" : "Other file";
            long days = Math.max(0, Duration.between(raw.modified, now).toDays());
            int score = 0;
            String reason;
            if (protectedFile) {
                reason = "Manual review only. Application, database or sensitive files are never suggested.";
            } else if (sameContent) {
                score = 95;
                reason = "SHA-256 matches " + root.relativize(duplicates.get(raw.path))
                        + ". Keep at least one copy; review before moving anything.";
            } else {
                score = (raw.size >= 1024L * MIB ? 45 : raw.size >= 250L * MIB ? 35
                        : raw.size >= 50L * MIB ? 20 : 0)
                        + (days >= 180 ? 25 : days >= 90 ? 15 : 0)
                        + (ARCHIVE.contains(extension) || MEDIA.contains(extension) ? 15 : 0);
                score = Math.min(score, 90);
                if (score >= 60) reason = "Large or older " + type.toLowerCase(Locale.ROOT)
                        + ". Consider archiving it to another drive after reviewing its contents.";
                else if (raw.size >= 250L * MIB) reason = "Large file. Review whether you still need it on this drive.";
                else reason = "Low priority. Keep this file unless you recognize it and no longer need it.";
            }
            result.add(new SpaceFix.Item(root, raw.path, raw.size, raw.modified, type, score, sameContent, reason));
        }
        result.sort(Comparator.comparingLong(SpaceFix.Item::size).reversed());
        return List.copyOf(result);
    }

    private record Raw(Path path, long size, Instant modified) {}

    private static boolean hidden(Path path) {
        try { return Files.isHidden(path); }
        catch (IOException ex) { return true; }
    }

    private static boolean containsBlockedSegment(Path path) {
        for (Path part : path) {
            if (BLOCKED_DIRS.contains(part.toString().toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private static String extension(Path path) {
        String filename = path.getFileName().toString();
        int at = filename.lastIndexOf('.');
        return at < 0 ? "" : filename.substring(at + 1).toLowerCase(Locale.ROOT);
    }

    private static boolean protectedType(Path path) { return PROTECTED.contains(extension(path)); }

    private static String digest(Path file) throws IOException {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (InputStream input = Files.newInputStream(file)) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) md.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(md.digest());
        } catch (NoSuchAlgorithmException impossible) {
            throw new IOException("SHA-256 unavailable", impossible);
        }
    }
}
