package com.cellar.deadlock;

/** Dependency-free smoke and regression tests. */
public final class DeadlockSentinelTest {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        var cycle = DeadlockSentinel.analyze(DeadlockSentinel.DEMO);
        check(cycle.threadsParsed() == 2, "expected two threads");
        check(cycle.cycles().size() == 1, "expected one cycle");
        check(cycle.cycles().get(0).size() == 2, "expected two cycle edges");

        String safe = """
            "worker-A" #1
                - locked <0x001> (a java.lang.Object)
            "worker-B" #2
                - waiting to lock <0x001> (a java.lang.Object)
            """;
        check(DeadlockSentinel.analyze(safe).cycles().isEmpty(), "ordinary contention is not deadlock");

        String unknown = """
            "worker-A" #1
                - waiting to lock <0x999> (a java.lang.Object)
            """;
        check(DeadlockSentinel.analyze(unknown).cycles().isEmpty(), "unknown owner must not trigger false positive");

        String synchronizers = """
            "pool-1" #1
                - parking to wait for <0x002> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
               Locked ownable synchronizers:
                - <0x001> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
            "pool-2" #2
                - parking to wait for <0x001> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
               Locked ownable synchronizers:
                - <0x002> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
            """;
        check(DeadlockSentinel.analyze(synchronizers).cycles().size() == 1, "ownable synchronizer cycle");
        System.out.println("DeadlockSentinelTest: all tests passed");
    }
}
