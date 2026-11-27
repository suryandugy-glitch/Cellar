import java.io.IOException;
import java.nio.file.*;

public class SpaceFixTest {
    public static void main(String[] args) throws Exception {
        Path source = Files.createDirectory(Path.of(args[0], "source"));
        Path dest = Files.createDirectory(Path.of(args[0], "dest"));
        Path small = Files.writeString(source.resolve("a.txt"), "a");
        Path large = Files.writeString(source.resolve("b.txt"), "large file");
        Files.createDirectory(source.resolve("nested"));
        var items = SpaceFix.scan(source);
        if (items.size() != 2 || !items.getFirst().path().equals(large)) throw new AssertionError("preview");
        if (args.length > 1) {
            Path otherDrive = Path.of(args[1]);
            Path batch = SpaceFix.transferBatch(items, otherDrive, Files.size(small) + Files.size(large));
            SpaceFix.verify(small, batch.resolve(small.getFileName()));
            SpaceFix.verify(large, batch.resolve(large.getFileName()));
            try {
                SpaceFix.transferBatch(items, dest, 1);
                throw new AssertionError("accepted source volume");
            } catch (IOException expected) {
                if (!expected.getMessage().contains("different drive")) throw expected;
            }
        }
        Path copy = SpaceFix.copy(items.getFirst(), dest);
        try {
            SpaceFix.copy(items.getFirst(), dest);
            throw new AssertionError("overwrote destination");
        } catch (FileAlreadyExistsException expected) {}
        Files.writeString(copy, "wrong file");
        try {
            SpaceFix.verify(large, copy);
            throw new AssertionError("approved changed content");
        } catch (IOException expected) {}
        if (!Files.readString(large).equals("large file") || !Files.exists(small)) throw new AssertionError("originals");

        // Agent: classification must protect personal files and only flag regenerable or clearly redundant ones.
        Path lab = Files.createDirectory(Path.of(args[0], "agent"));
        long old = System.currentTimeMillis() - 400L * 86_400_000L;
        Path doc = Files.writeString(lab.resolve("tax.docx"), "keep me");
        Path junk = Files.writeString(lab.resolve("leftover.tmp"), "junk");
        Path fresh = Files.writeString(lab.resolve("new.tmp"), "just made");
        Path first = Files.write(lab.resolve("a.bin"), new byte[2_100_000]);
        Path second = Files.write(lab.resolve("copy of a.bin"), new byte[2_100_000]);
        Path blocked = Files.createDirectory(lab.resolve("AppData"));
        Path hidden = Files.writeString(blocked.resolve("x.tmp"), "app data");
        for (Path p : new Path[]{doc, junk, first, hidden}) Files.setLastModifiedTime(p, java.nio.file.attribute.FileTime.fromMillis(old));
        Files.setLastModifiedTime(second, java.nio.file.attribute.FileTime.fromMillis(old + 5_000));
        var report = SpaceFix.analyze(lab, null);
        var paths = report.findings().stream().map(SpaceFix.Finding::path).toList();
        if (!paths.contains(junk)) throw new AssertionError("agent missed old temp file");
        if (paths.contains(doc)) throw new AssertionError("agent flagged a document");
        if (paths.contains(fresh)) throw new AssertionError("agent flagged a fresh file");
        if (paths.contains(hidden)) throw new AssertionError("agent entered an off-limits folder");
        if (paths.contains(first) || !paths.contains(second)) throw new AssertionError("duplicate handling");
        if (report.findings().stream().filter(f -> f.path().equals(junk)).anyMatch(f -> f.verdict() != SpaceFix.Verdict.SAFE))
            throw new AssertionError("temp file should be SAFE");
        if (report.findings().stream().filter(f -> f.path().equals(second)).anyMatch(f -> f.verdict() != SpaceFix.Verdict.REVIEW))
            throw new AssertionError("duplicate must need review");
        for (Path p : new Path[]{doc, junk, fresh, first, second, hidden}) if (!Files.exists(p)) throw new AssertionError("analysis changed files");
    }
}
