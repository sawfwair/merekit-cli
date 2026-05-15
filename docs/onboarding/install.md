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

The media adapter is resolved the same way, but local media processing has extra runtime dependencies: `mere media process ... --transcribe --embed` calls the public `mere.run` executable and needs local ASR/embedding models. Run `mere setup mere-run --json` to orchestrate the runtime install, then `mere setup mere-run models --app media --json` to pull app-requested models. In a local Mere checkout, it builds from `~/mere/run-public`; installed users can download `https://mere.run/releases/mere-run.dmg` by providing a verified checksum with `MERE_MEDIA_MERE_RUN_DOWNLOAD_SHA256` or `--sha256`.

The Link adapter is bundled from the public `@merekit/link` package. Use `mere link ...` from this root CLI, or install `@merekit/link` directly when you only need the standalone `mere-link` graph and policy tool:

```sh
npm install -g @merekit/link
mere-link config init --output mere.link.yaml
mere-link policy evaluate workspace workspace --capability project.context.export --operator approved-agent --json
mere-link config validate --config mere.link.yaml --json
```

Executor-backed Link commands require a separate Executor-compatible HTTP runtime; Executor is not bundled into `@merekit/cli`.

## Check The Command Plane

```sh
mere --help
mere help onboard
mere apps list --json
mere ops doctor --json
```

If those work, continue to [First Run](/onboarding/first-run).
