# Cellar SpaceFix

Download [SpaceFix.exe for Windows x64](https://github.com/suryandugy-glitch/Cellar-Studio/releases/download/spacefix-v1.0.1/SpaceFix.exe). Open Downloads and double-click the file. SpaceFix opens directly with its bundled runtime. For a Start menu shortcut, use [SpaceFix Setup](https://github.com/suryandugy-glitch/Cellar-Studio/releases/download/spacefix-v1.0.1/SpaceFix-Setup.exe).

For the optional portable Java ZIP: Extract it and double-click Start-SpaceFix.cmd on a Windows desktop with Java 21 or newer. On another desktop with Java 21+, run `java -jar SpaceFix.jar`.

Choose a folder containing personal documents or media. SpaceFix lists its visible regular files, largest first. Use Ctrl or Shift to select multiple entries. Choose a folder on a different volume to create a new batch of copies. SpaceFix compares the main contents of each file byte for byte. Open the copies and check them before reviewing the originals for recycling. Windows reclaims space after you empty the Recycle Bin. On systems without Java desktop recycling support, review the originals in your file manager.

Close applications that may modify the files during transfer and review. Use this tool for ordinary personal files. Application data, cloud placeholders, alternate streams, filesystem permissions, and system folders are outside its scope. A failed or interrupted copy leaves the originals in place. Inspect any incomplete destination batch before retrying. Closing the app discards its cleanup selection.

## Build and test

From this directory run `sh package.sh` with a Java 21 JDK and Python 3. It tests the transfer engine and writes the website download to deploy/pages/SpaceFix.zip.
