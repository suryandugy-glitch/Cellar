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
    }
}
