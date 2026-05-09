# Contributing

Thanks for helping improve Mere CLI.

By contributing to this repository, you agree that your contributions are licensed under the same license as the project: Apache License, Version 2.0.

Please read `SECURITY.md` before changing adapter handling, MCP behavior, auth flows, package contents, or release scripts.

## Development

```sh
pnpm install
pnpm lint
pnpm check
pnpm test
pnpm coverage
pnpm check:adapters
pnpm smoke
pnpm smoke:mcp
pnpm check:package
```

For the full agent-readiness gate, run:

```sh
pnpm verify
```

For docs-only changes, also run:

```sh
pnpm docs:build
```

Before opening a pull request, please run the relevant checks and avoid committing secrets, local state, generated source maps, machine-specific paths, customer data, workspace data, tenant IDs, or private service URLs.

## Adapter Safety

Bundled adapters are public client artifacts. It is expected that they expose command names, route shapes, environment variable names, and default service URLs. They must not contain credentials, real tenant data, customer data, source maps, or private app source.

Adapter manifests must use the supported `risk` values:

- `read`
- `write`
- `destructive`
- `external`

External and destructive commands must require explicit confirmation. Commands that mutate local auth context, create usable access artifacts, call providers, or contact external systems must not be marked as plain reads. Run `pnpm check:adapters` after changing any adapter or manifest safety helper.

## Pull Requests

Keep changes focused and describe the user-facing behavior, verification commands, and security implications. If a change affects package contents, include the relevant `pnpm check:package` or `pnpm pack:dry` result.

For release-facing changes, update `CHANGELOG.md` and `docs/release-checklist.md` when needed.

Do not include screenshots, logs, traces, or command output that reveal tokens, sessions, customer data, private workspaces, private URLs, or internal incident details.

## Scope

This repository contains the public Mere CLI package. The Apache-2.0 license covers this repository's code and documentation, but does not grant access to Mere hosted services, workspaces, credentials, customer data, platform operator permissions, or Mere/Sawfwair trademarks.

Product service behavior, hosted infrastructure, private app repositories, operator workflows, and production authorization policies live outside this repository.
