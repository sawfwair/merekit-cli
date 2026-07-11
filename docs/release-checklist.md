# Release Checklist

Use this before publishing `@merekit/cli` or making release-facing repository changes.

## Preflight

```sh
pnpm verify
pnpm docs:build
pnpm docs:worker:test
pnpm docs:worker:dry-run
pnpm check
pnpm lint
pnpm check:adapters
pnpm check:adapter-provenance
pnpm check:supply-chain
pnpm test
pnpm coverage
pnpm smoke
pnpm smoke:mcp
pnpm check:package
pnpm test:pack
pnpm pack:dry
node ../plugins/scripts/sync-cli.mjs .   # internal: sync Codex/Claude plugin catalogs to this CLI version
gitleaks detect --source . --log-opts=--all --redact
npm audit --audit-level=moderate --omit=dev --package-lock-only --ignore-scripts
npm audit signatures --package-lock-only --ignore-scripts
```

## Public Repo Settings

- Enable GitHub secret scanning and push protection.
- Enable private vulnerability reporting.
- Protect `main` from force pushes.
- Require the CI workflow before merge.
- Enable Dependabot for npm and GitHub Actions.
- Set the repository description, homepage, and topics.
- Confirm the Pages source is GitHub Actions and the Docs workflow deploys to `https://sawfwair.github.io/merekit-cli/`.
- For hosted product docs or docs API changes, confirm `pnpm docs:worker:test` and `pnpm docs:worker:dry-run` pass before deploy.
- Configure npm Trusted Publishing for `@merekit/cli`:
  - Provider: GitHub Actions.
  - Repository: `sawfwair/merekit-cli`.
  - Workflow filename: `publish.yml`.
  - Environment name: `npm`.
- Require maintainer 2FA for npm publishing and keep releases tokenless; do not add an `NPM_TOKEN` secret for normal publishing.
- Confirm `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `SECURITY.md`, issue templates, and pull request template are present.

## Publish

- Confirm `SECURITY.md` still describes the adapter/API-shape model.
- Set `MERE_ROOT=/path/to/mere-sibling-repositories` and provide a read-only `GH_TOKEN` that can read each source repository, pull-request reviews, and checks. Run `pnpm build:adapters:release`; do not promote a development-mode adapter build.
- Confirm every adapter source is a clean checkout of the live canonical `main` head. Release mode rejects dirty trees, unmerged paths, local or stale heads, draft/unmerged pull requests, direct commits without exact review evidence, stale/author-only approvals, and pending or red checks.
- Review `adapters/manifest.json` schema v2. Every entry must bind the canonical source URL, exact commit and tree, clean/default-branch/review evidence, deterministic commands and toolchain, complete artifact SHA-256/size inventory, and Mere Console Contract v1 schema/fixture digests when present.
- Confirm release mode completed two builds with the same `SOURCE_DATE_EPOCH` and installed the bundle only after byte-for-byte inventory comparison. Then rerun `pnpm check:adapter-provenance` independently.
- Do not invent provenance for a legacy schema-v1 bundle. The current legacy bundle must be regenerated from eligible upstream source commits before the next public package; the publication gate intentionally fails until that happens.
- Confirm `CHANGELOG.md`, `package.json`, `pnpm-lock.yaml`, `npm-shrinkwrap.json`, and the npm version all agree.
- Confirm dependency changes are exact-pinned and any new install-time lifecycle scripts are reviewed in `security/install-lifecycle-scripts.json`.
- Confirm the Codex and Claude plugin catalogs are synced to this CLI version.
- Confirm the dry-run tarball contains only intended files.
- Merge the release PR to `main`; the `Publish` GitHub Actions workflow runs automatically when `package.json` contains a version newer than npm. It uses OIDC trusted publishing, so no long-lived npm publish token is required.
- Use the manual `Publish` workflow only for an intentional rerun or non-`latest` dist-tag.
- Confirm the workflow created the matching GitHub Release after npm publish succeeds.
