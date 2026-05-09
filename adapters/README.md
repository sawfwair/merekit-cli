# Generated Adapters

This directory contains generated public client artifacts for bundled Mere app CLIs.
They are committed so the `@merekit/cli` npm package works out of the box after a global install.

Bundled adapters in this build:

- `business`
- `finance`
- `projects`
- `agent`
- `today`
- `zone`
- `video`
- `network`
- `email`
- `gives`
- `works`
- `media`
- `deliver`
- `link`

The `link` adapter is bundled from the public `@merekit/link` TypeScript package source. It provides standalone YAML-based cross-surface linking and can bootstrap configuration from a Mere workspace snapshot.

The `media` adapter is generated from the Mere media app, but local transcription and embedding commands delegate to the public `mere.run` runtime and local models. Run `mere setup mere-run` to orchestrate the runtime install from an existing binary, the local `~/mere/run-public` source checkout, or the verified DMG at `https://public.stereovoid.com/mere-run-releases/mere-run.dmg`. Run `mere setup mere-run models --app media` to pull Media-requested models. Set `MERE_MEDIA_MERE_RUN_BIN` or `MERE_RUN_BIN` only when you need an explicit runtime override.

The adapters intentionally expose command names, public API route shapes, environment variable names, and default service URLs. They do not contain credentials or grant access to Mere hosted services.

Access is enforced by the Mere services through browser sessions, bearer tokens, workspace membership, roles, destructive-operation confirmations, and server-side authorization checks.

Adapter manifests must mark command risk honestly as `read`, `write`, `destructive`, or `external`. Destructive commands must require explicit confirmation.

Maintainers regenerate these files from the Mere app repositories with `pnpm build:adapters`. That command expects the private app repositories to be available as sibling directories and is not required for normal public development of the root CLI.
