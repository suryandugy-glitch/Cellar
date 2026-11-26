package com.cellar.deadlock;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Snapshot-based JVM deadlock cycle detector. No external dependencies. */
public final class DeadlockSentinel {
    private static final Pattern HEADER = Pattern.compile("^\\\"([^\\\"]+)\\\".*");
    private static final Pattern LOCKED = Pattern.compile(".*- locked <(0x[0-9a-fA-F]+)>.*");
    private static final Pattern WAITING = Pattern.compile(".*- (?:waiting to lock|parking to wait for) <(0x[0-9a-fA-F]+)>.*");
    private static final Pattern OWNABLE = Pattern.compile(".*- <(0x[0-9a-fA-F]+)> \\(a .*");
    private DeadlockSentinel() {}

    public record ThreadInfo(String name, Set<String> owns, String waitsFor) {}
    public record Edge(String waiter, String lock, String owner) {}
    public record Result(List<List<Edge>> cycles, int threadsParsed) {}

    public static Result analyze(String dump) {
        Map<String, ThreadInfo> threads = parse(dump);
        Map<String, String> owners = new HashMap<>();
        threads.values().forEach(t -> t.owns().forEach(lock -> owners.putIfAbsent(lock, t.name())));
        Map<String, Edge> edges = new HashMap<>();
        for (ThreadInfo t : threads.values()) {
            String owner = owners.get(t.waitsFor());
            if (owner != null && !owner.equals(t.name())) {
                edges.put(t.name(), new Edge(t.name(), t.waitsFor(), owner));
            }
        }
        List<List<Edge>> cycles = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        for (String start : threads.keySet()) {
            if (visited.contains(start)) continue;
            Map<String, Integer> position = new LinkedHashMap<>();
            String current = start;
            while (current != null && !visited.contains(current) && !position.containsKey(current)) {
                position.put(current, position.size());
                Edge edge = edges.get(current);
                current = edge == null ? null : edge.owner();
            }
            if (current != null && position.containsKey(current)) {
                List<Edge> cycle = new ArrayList<>();
                boolean inCycle = false;
                for (String name : position.keySet()) {
                    if (name.equals(current)) inCycle = true;
                    if (inCycle) cycle.add(edges.get(name));
                }
                cycles.add(List.copyOf(cycle));
            }
            visited.addAll(position.keySet());
        }
        return new Result(List.copyOf(cycles), threads.size());
    }

    public static Map<String, ThreadInfo> parse(String dump) {
        Map<String, ThreadInfo> result = new LinkedHashMap<>();
        String name = null;
        Set<String> owned = new HashSet<>();
        String waiting = null;
        boolean ownable = false;
        for (String line : dump.split("\\R")) {
            Matcher header = HEADER.matcher(line);
            if (header.matches()) {
                if (name != null) result.put(name, new ThreadInfo(name, Set.copyOf(owned), waiting));
                name = header.group(1);
                owned = new HashSet<>();
                waiting = null;
                ownable = false;
                continue;
            }
            if (name == null) continue;
            if (line.trim().equals("Locked ownable synchronizers:")) {
                ownable = true;
                continue;
            }
            Matcher held = LOCKED.matcher(line);
            if (held.matches()) owned.add(held.group(1).toLowerCase());
            Matcher wait = WAITING.matcher(line);
            if (wait.matches()) waiting = wait.group(1).toLowerCase();
            if (ownable) {
                Matcher sync = OWNABLE.matcher(line);
                if (sync.matches()) owned.add(sync.group(1).toLowerCase());
            }
        }
        if (name != null) result.put(name, new ThreadInfo(name, Set.copyOf(owned), waiting));
        return result;
    }

    public static String report(Result result) {
        StringBuilder text = new StringBuilder("Cellar Deadlock Sentinel | threads parsed: ")
                .append(result.threadsParsed()).append(System.lineSeparator());
        if (result.cycles().isEmpty()) return text.append("No deadlock cycle detected in this snapshot.").toString();
        text.append("Detected ").append(result.cycles().size()).append(" deadlock cycle(s).");
        int index = 1;
        for (List<Edge> cycle : result.cycles()) {
            text.append(System.lineSeparator()).append("Cycle ").append(index++).append(":");
            for (Edge edge : cycle) {
                text.append(System.lineSeparator()).append("  ")
                    .append(edge.waiter()).append(" waits for ").append(edge.lock())
                    .append(" held by ").append(edge.owner());
            }
        }
        return text.toString();
    }

    public static void main(String[] args) {
        if (args.length != 1) {
            System.err.println("Usage: java com.cellar.deadlock.DeadlockSentinel <thread-dump.txt> | --demo");
            System.exit(2);
        }
        try {
            String dump = args[0].equals("--demo") ? DEMO : Files.readString(Path.of(args[0]));
            Result result = analyze(dump);
            System.out.println(report(result));
            if (!result.cycles().isEmpty()) System.exit(1);
        } catch (IOException | RuntimeException error) {
            System.err.println("Unable to analyze thread dump: " + error.getMessage());
            System.exit(2);
        }
    }

    public static final String DEMO = """
            "worker-A" #11 prio=5
               java.lang.Thread.State: BLOCKED
                - waiting to lock <0x002> (a java.lang.Object)
                - locked <0x001> (a java.lang.Object)
            "worker-B" #12 prio=5
               java.lang.Thread.State: BLOCKED
                - waiting to lock <0x001> (a java.lang.Object)
                - locked <0x002> (a java.lang.Object)
            """;
}
