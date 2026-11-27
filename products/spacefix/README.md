# Cellar SpaceFix 1.1 — a careful way to make room

SpaceFix is a Windows x64 desktop utility by Cellar Studio. Its light, neo-brutalist interface helps you **find space-saving opportunities on a personal drive**, understand each suggestion, and copy files to another drive safely before deciding what to remove. It never deletes a file as part of a scan or copy.

## Download and launch

| Edition | Download | Requirement |
| --- | --- | --- |
| Direct-launch Windows app | [SpaceFix.exe](https://github.com/suryandugy-glitch/Cellar-Studio/releases/download/spacefix-v1.1.0/SpaceFix.exe) | Windows x64; Java included |
| Windows installer | [SpaceFix-Setup.exe](https://github.com/suryandugy-glitch/Cellar-Studio/releases/download/spacefix-v1.1.0/SpaceFix-Setup.exe) | Windows x64; per-user installation; Java included |
| Portable Java edition | [SpaceFix.zip](https://github.com/suryandugy-glitch/Cellar-Studio/releases/download/spacefix-v1.1.0/SpaceFix.zip) | Java 21+; extract and use `Start-SpaceFix.cmd` or `java -jar SpaceFix.jar` |

These links become live once the `SpaceFix Windows installer` release workflow finishes for v1.1.0.

## How it works

1. **Scan a personal folder.** Start with Downloads, Documents, Videos, or another folder you own. SpaceFix reads ordinary visible files, up to seven levels deep and 25,000 files per scan. The scan **does not change anything**.
2. **Review the smart insights.** Search and filter by suggested files, matched duplicates, or large files. Each row explains its priority score; select exactly the files you wish to move. You can also use **Select Suggestions** to preselect the candidates, then manually review that selection.
3. **Copy + Verify.** Choose a destination on **another volume** with enough free space. SpaceFix creates a new batch folder, preserves relative paths, compares original and copy byte-for-byte, and **leaves every original in place**. If a copy fails, inspect the incomplete batch; no original is removed.
4. **Open Copies.** Confirm that your files open as expected. For important documents, keep an additional independent backup.
5. **Review Recycle.** Only if you explicitly approve a second confirmation does SpaceFix re-verify each copy and ask Windows to move originals to the Recycle Bin. Emptying the Recycle Bin is a separate manual action that actually reclaims the space. If Windows recycling isn't supported, review originals yourself in File Explorer.

## What the “intelligence” means

SpaceFix's recommendations are **local, deterministic and explainable** — not a cloud AI model or an LLM. They use file size, age, file type, and exact **SHA-256** content matches for bounded duplicate candidates. The application does not upload filenames, files or usage data. A duplicate match is a lead for review, **not permission to delete**. Scores are estimates, not guarantees that a file is disposable.

## Safety boundaries

- Intended for **ordinary personal files**, not operating system cleaning, registries, application installs, backups in active use, or database maintenance. SpaceFix refuses to scan drive roots, the user-home root, and known system/application folders; it avoids symlinks, hidden files, and protected file types when suggesting changes.
- Close programs that could modify a file during transfer. Snapshot checks and full byte comparisons protect against many failures, but they cannot guarantee safety across power loss, removable-drive disconnects, cloud synchronization, alternate data streams, permissions, or concurrent filesystem changes.
- Scanning uses bounded hashing (up to 80 candidates, at most 256 MiB each); **not every possible duplicate is detected**. A file's age or extension alone cannot tell whether it is needed.
- The selected destination **must be on a different volume** to free space on the source volume. Do not depend on duplicate copies stored on the same physical drive as your sole backup.
- If the recycle step stops partway through, some originals may already be in the Recycle Bin. Look there and in the verified destination batch before taking further action. Emptying the Recycle Bin cannot be undone through SpaceFix.

## Build, test and release

Requires JDK 21 and Python 3. Run `sh products/spacefix/package.sh` from the repository root to compile the Java classes, run regression tests and prepare `deploy/pages/SpaceFix.zip`.

On a push to `main` that updates the Java app or its Windows packaging workflow, `.github/workflows/spacefix-windows.yml` compiles and tests the app on Windows, smoke-tests the runtime-bundled native app and installer, builds a direct-launch EXE, and uploads three downloads to the `spacefix-v1.1.0` GitHub release.

The app itself requires no network connection, account, API key, or external AI subscription.
