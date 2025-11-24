# Versioning Strategy

## Branch Structure

- **master** - Production releases (e.g., `1.0.0`, `1.0.1`)
- **develop** - Development builds (e.g., `1.0.0-1`, `1.0.0-2`, `1.0.0-19`)
- **feature branches** - Work in progress

## Version Format

### Release Versions (master)
- Format: `MAJOR.MINOR.PATCH`
- Example: `1.0.0`, `1.0.1`, `2.0.0`

### Build Versions (develop)
- Format: `MAJOR.MINOR.PATCH-BUILD`
- Example: `1.0.0-1`, `1.0.0-19`, `1.0.1-1`

## Workflow

### During Development (develop branch)
1. Push to develop triggers auto-increment of build number
2. `1.0.0` → `1.0.0-1` → `1.0.0-2` → ... → `1.0.0-19`
3. Each push increments the build suffix

### Creating a Release
1. Merge develop to master
2. Run: `bun run version:release [major|minor|patch]`
3. This removes build suffix and bumps version
4. `1.0.0-19` → `1.0.1`
5. Tag and publish release
6. Merge back to develop
7. Next develop build will be `1.0.1-1`

## Manual Commands

```bash
# Bump build number (develop only)
bun run version:build

# Bump release version (master only)
bun run version:release patch  # 1.0.0 → 1.0.1
bun run version:release minor  # 1.0.0 → 1.1.0
bun run version:release major  # 1.0.0 → 2.0.0
```

## Example Flow

```
develop: 1.0.0 → 1.0.0-1 → 1.0.0-2 → ... → 1.0.0-19
         ↓ merge to master
master:  1.0.1 (release)
         ↓ merge back to develop
develop: 1.0.1 → 1.0.1-1 → 1.0.1-2 → ...
```
