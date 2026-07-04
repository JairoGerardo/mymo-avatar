# Development & Release Process

## Setup

```bash
pnpm install
```

## Development

```bash
# Build the core package in watch mode
cd packages/core
pnpm dev
```

## Making changes

1. Edit source files in `packages/core/src/`
2. Run the build to verify everything compiles:
   ```bash
   cd packages/core
   pnpm build
   ```
3. Test your changes using one of the examples:
   ```bash
   cd examples/vanilla
   pnpm dev
   ```

## Publishing a new version to npm

### 1. Build the package
```bash
cd packages/core
pnpm build
```

### 2. Bump the version

For a bug fix:
```bash
npm version patch --no-git-tag-version
```

For a new feature:
```bash
npm version minor --no-git-tag-version
```

For a breaking change:
```bash
npm version major --no-git-tag-version
```

### 3. Publish
```bash
npm publish --access public
```

The `prepack` script copies the root `README.md` automatically before packaging.

### 4. Commit and push
```bash
git add packages/core/package.json pnpm-lock.yaml
git commit -m "feat: release vX.X.X"
git push
```

> After changing the package version, always run `pnpm install` from the root to keep `pnpm-lock.yaml` in sync with CI.

## Versioning reference

| Change type | Command | Example |
|---|---|---|
| Bug fix | `npm version patch` | `0.1.3` → `0.1.4` |
| New feature | `npm version minor` | `0.1.3` → `0.2.0` |
| Breaking change | `npm version major` | `0.1.3` → `1.0.0` |

## Updating static assets (models / audio)

Models and audio files are distributed via GitHub Releases, not committed to the repo.

To add or update assets:

```bash
gh release upload v0.1.0-assets path/to/new-model.vrm
```

Or create a new release for a new asset version:

```bash
gh release create v0.2.0-assets \
  --title "Static Assets v0.2.0" \
  --notes "Added new avatar model" \
  path/to/model.vrm
```

Then update the URLs in all examples and README.
