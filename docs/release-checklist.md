# Release Checklist

Use this before publishing `@merekit/cli` or making release-facing repository changes.

## Preflight

```sh
pnpm check
pnpm check:adapters
pnpm test
pnpm smoke
pnpm smoke:mcp
pnpm check:package
pnpm docs:build
pnpm test:pack
pnpm pack:dry
gitleaks detect --source . --log-opts=--all --redact
```

## Public Repo Settings

- Enable GitHub secret scanning and push protection.
- Enable private vulnerability reporting.
- Protect `main` from force pushes.
- Require the CI workflow before merge.
- Enable Dependabot for npm and GitHub Actions.
- Set the repository description, homepage, and topics.
- Confirm the Pages source is GitHub Actions and the Docs workflow deploys to `https://sawfwair.github.io/merekit-cli/`.
- Configure npm Trusted Publishing for `@merekit/cli`:
  - Provider: GitHub Actions.
  - Repository: `sawfwair/merekit-cli`.
  - Workflow filename: `publish.yml`.
  - Environment name: `npm`.
- Confirm `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `SECURITY.md`, issue templates, and pull request template are present.

## Publish

- Confirm `SECURITY.md` still describes the adapter/API-shape model.
- Confirm `CHANGELOG.md`, `package.json`, and the npm version all agree.
- Confirm the dry-run tarball contains only intended files.
- Publish through the manual `Publish` GitHub Actions workflow. It uses OIDC trusted publishing, so no long-lived npm publish token is required.
- Confirm the workflow created the matching GitHub Release after npm publish succeeds.
