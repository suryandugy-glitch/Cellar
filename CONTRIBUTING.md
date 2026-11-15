# Contributing

Use JDK 21+, run `java Build.java test`, and keep checks deterministic. New validations must document blank-value semantics and preserve the rule that reports never contain CSV cell values. Add a behavior test for a real regression/rule. Maintain the distinction between a contract failure and invalid input.

Do not add outbound telemetry, execute uploaded scripts, relax local API boundaries or include production data. Larger changes need an architecture note and migration impact. Use the PR template and synthetic fixtures. The current project is MIT licensed; maintain attribution.

The lightweight build script is the supported build entry point. Import `src/main/java` and `src/test/java` as source roots in your IDE. A Maven/Gradle build is not required or included.
