# Key Rotation and History Purge Runbook

> [!CAUTION]
> **Treat the committed master key as compromised.** Any deployment that ever used the repository's committed master key or default test keys must be rotated immediately. Never commit master keys, encrypted data vaults, or audit logs to source control.

---

## 1. Compromise Assessment & Deployment Rotation

If any production, staging, or pilot deployment previously ran using the committed `data/master.key` or a default environment key:

1. **Stop the running Cellar instances** immediately:
   ```sh
   docker compose -f deploy/docker-compose.yml down
   # or terminate the java process
   ```
2. **Generate a new 32-byte cryptographically secure master key**:
   ```sh
   openssl rand -base64 32
   ```
3. Store this new key in your secure secret manager (e.g. AWS Secrets Manager, HashiCorp Vault, GitHub Encrypted Secrets) and configure it as `CELLAR_MASTER_KEY`.
4. Re-encrypt or migrate stored workspace data (see section 3 below).

---

## 2. Git History Purge (For Repository Owner)

The repository history historically contained `data/master.key`, `data/workspace.enc`, `data/history.enc`, `data/baseline.enc`, and `data/audit.log`. Although deleted from the active worktree, these files remain in Git packfiles.

The owner must run the following commands manually to purge the history:

### Prerequisites
Install `git-filter-repo` (recommended by Git over `git filter-branch`):
```sh
pip install git-filter-repo
```

### History Purge Steps
```sh
# 1. Ensure you have a fresh, full clone of the repository
git clone https://github.com/suryandugy-glitch/Cellar.git cellar-purge
cd cellar-purge

# 2. Purge the data directory from all branches and tags
git filter-repo --path data --invert-paths

# 3. Verify no sensitive files remain in any commit history
git log --all --full-history -- "data/*" "**/master.key"

# 4. Force-push the purged history to remote
# WARNING: This rewrites published Git history. Coordinate with all team members before running!
git push origin --force --all
git push origin --force --tags
```

### Post-Purge Steps for Collaborators
Every collaborator must discard their previous local clone to prevent reintroducing purged commits:
```sh
cd ..
rm -rf Cellar
git clone https://github.com/suryandugy-glitch/Cellar.git
```

---

## 3. Re-encrypting a Workspace Under a New Master Key

When rotating `CELLAR_MASTER_KEY` on an existing deployment while retaining the active contract:

### Option A: Clean Cutover via Export / Import (Recommended)
1. Before shutting down or changing keys, export the current contract configuration:
   ```sh
   curl -H "X-Access-Key: $CELLAR_ACCESS_KEY" https://localhost/api/config > contract-backup.json
   ```
2. Stop the Cellar service:
   ```sh
   docker compose -f deploy/docker-compose.yml down
   ```
3. Archive and clear the old data directory:
   ```sh
   mv data/ data.compromised-backup/
   mkdir -m 0700 data
   ```
4. Set the new `CELLAR_MASTER_KEY` in your environment or secret manager.
5. Start Cellar:
   ```sh
   docker compose -f deploy/docker-compose.yml up -d
   ```
6. Restore your contract:
   ```sh
   curl -X POST -H "X-Access-Key: $CELLAR_ACCESS_KEY" \
     -H "Content-Type: application/json" \
     --data-binary @contract-backup.json https://localhost/api/config
   ```

### Option B: Offline In-Place Re-encryption
If historical audit logs and revisions must be preserved in-place across the key rotation, run an offline re-encryption script using Java 21:

```java
import io.cellar.web.Crypto;
import java.nio.file.*;
import java.util.Base64;

public class ReEncryptWorkspace {
    public static void main(String[] args) throws Exception {
        if (args.length < 3) {
            System.err.println("Usage: java ReEncryptWorkspace <data-dir> <old-base64-key> <new-base64-key>");
            System.exit(1);
        }
        Path dir = Path.of(args[0]);
        Crypto oldCrypto = new Crypto(Base64.getDecoder().decode(args[1].trim()));
        Crypto newCrypto = new Crypto(Base64.getDecoder().decode(args[2].trim()));

        String[] encryptedFiles = {"workspace.enc", "history.enc", "baseline.enc"};
        for (String file : encryptedFiles) {
            Path target = dir.resolve(file);
            if (Files.exists(target)) {
                byte[] cipher = Files.readAllBytes(target);
                byte[] plain = oldCrypto.decrypt(file, cipher);
                byte[] reEncrypted = newCrypto.encrypt(file, plain);
                Files.write(target, reEncrypted, StandardOpenOption.TRUNCATE_EXISTING);
                System.out.println("Re-encrypted " + file);
            }
        }
        System.out.println("Workspace files successfully re-encrypted under new master key.");
    }
}
```
Run with classpath pointing to `build/classes` or `dist/cellar.jar`:
```sh
java -cp dist/cellar.jar ReEncryptWorkspace ./data "$OLD_MASTER_KEY" "$NEW_MASTER_KEY"
```
