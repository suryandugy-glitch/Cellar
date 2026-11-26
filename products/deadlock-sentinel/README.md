# Cellar Deadlock Sentinel

Java 21+ command-line analyzer for JVM thread dumps. This is an independent Cellar product prototype.

## What works

- Parses HotSpot-style thread headers, monitor ownership (`- locked <id>`) and monitor waits (`- waiting to lock <id>`).
- Also recognizes `java.util.concurrent` ownable synchronizers shown as `- <id> (a ...)` under `Locked ownable synchronizers:`, and `- parking to wait for <id>`.
- Constructs a thread wait-for graph, identifies cycles, and prints each thread, awaited lock and owning thread.
- Provides deterministic human-readable output and exit codes: 0 = no detected cycle, 1 = detected cycle, 2 = input or usage error.
- No third-party dependencies, cloud services, telemetry, or AI claims.

## Run

```sh
cd products/deadlock-sentinel
javac -d out src/main/java/com/cellar/deadlock/DeadlockSentinel.java
java -cp out com.cellar.deadlock.DeadlockSentinel samples/deadlock.txt
java -cp out com.cellar.deadlock.DeadlockSentinel --demo
```

## Test

```sh
cd products/deadlock-sentinel
javac -d out src/main/java/com/cellar/deadlock/DeadlockSentinel.java src/test/java/com/cellar/deadlock/DeadlockSentinelTest.java
java -cp out com.cellar.deadlock.DeadlockSentinelTest
```

## Capture a JVM dump

```sh
jcmd <PID> Thread.print -l > threads.txt
java -cp out com.cellar.deadlock.DeadlockSentinel threads.txt
```

Thread dumps may contain sensitive stack traces and identifiers. Analyze locally; avoid posting production dumps publicly.

## Scope and limitations

A reported cycle is based on one snapshot of lock ownership and waiting. The analyzer targets common HotSpot thread-dump formats and is not a general proof of deadlock freedom. Unknown lock owners are not treated as deadlocks. It cannot predict future deadlocks, and it does not currently instrument application code, detect distributed deadlocks, or expose a web API.

## Roadmap

1. Add structured JSON/SARIF reports and fixtures for multiple JDK versions.
2. Add Java agent instrumentation and continuous lock-order history with overhead benchmarks.
3. Add CI baselines, regression diffing and an optional Java HTTP service.
4. Research prediction separately, reporting false-positive rates on reproducible concurrency workloads.

This folder is intentionally isolated from the Cellar CSV validator and its deployment.
