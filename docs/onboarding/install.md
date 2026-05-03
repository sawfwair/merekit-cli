# Install

Install `@merekit/cli` when you want the public `mere` command, bundled app adapters, docs, and the repo-local `mere-cli` skill.

## Requirements

- Node.js `>=24 <26`.
- npm or pnpm.
- Mere workspace access for workspace-scoped product reads.
- App auth where the target product requires it.

## Install From npm

```sh
npm install -g @merekit/cli
mere --help
```

With pnpm:

```sh
pnpm add -g @merekit/cli
mere --help
```

Confirm the installed package can resolve app adapters:

```sh
mere apps list --json
mere ops doctor --json
```

Installed users should normally see app CLI entries with `source: "bundled"`.

## Use This Repository

For development inside this repo:

```sh
pnpm install
pnpm build
node dist/run.js --help
node dist/run.js help onboard
```

The npm package ships compiled runtime files under `dist/` and bundled app adapters under `adapters/`. Public contributors do not need to rebuild app adapters for normal root CLI development.

## App CLI Resolution

When `mere` delegates to an app CLI, it resolves the adapter in this order:

1. Explicit environment override, such as `MERE_PROJECTS_CLI=/path/to/run.js`.
2. Bundled adapter inside `@merekit/cli/adapters/`.
3. Local Mere repository paths under `MERE_ROOT`.
4. App binaries on `PATH`, such as `mere-projects`, `mere-zone`, or `merefi`.

Use `MERE_CLI_SOURCE=auto|bundled|local|path` to force a source while debugging install behavior.

## Check The Command Plane

```sh
mere --help
mere help onboard
mere apps list --json
mere ops doctor --json
```

If those work, continue to [First Run](/onboarding/first-run).
