# Mere CLI

`mere` is the portfolio command plane for Mere. It is the single entrypoint for humans and agents, while product behavior stays owned by app CLI adapters bundled inside this package. The root CLI adds discovery, context, audit logs, diagnostics, smoke checks, workspace snapshots, and MCP access.

```sh
mere apps list
mere agent bootstrap --workspace ws_123 --target codex --json
mere ops doctor --json
mere auth status --all --json
mere context set-workspace --workspace ws_123
mere ops workspace-snapshot --json
mere apps manifest --app projects --json
mere help agent
```

## First Use

Use this sequence when an agent or new CLI user enters the system:

```sh
mere agent bootstrap --workspace ws_123 --target codex --json
mere apps list --json
mere ops doctor --json
mere auth status --all --json
mere auth status --app finance --json
mere finance profiles list --json
mere context set-workspace --workspace ws_123
mere ops workspace-snapshot --workspace ws_123 --json
mere apps manifest --app projects --json
```

The snapshot is the safest first operational read. It runs only manifest-declared read commands and groups results by app.

`agent bootstrap` wraps that first-use sequence and writes a secret-free context pack for an agent:

```txt
~/.config/mere/agents/default/
  AGENT.md
  bootstrap.json
  apps-list.json
  doctor.json
  auth-status.json
  finance-profiles.json
  apps-manifest.json
  workspace-snapshot.json
  mcp.json
  command-reference.md
```

## Install

From the repo:

```sh
pnpm install
pnpm build
node dist/run.js --help
node dist/run.js help agent
```

From npm after publishing:

```sh
npm install -g @merekit/cli
mere --help
mere help agent
```

With pnpm:

```sh
pnpm add -g @merekit/cli
mere ops doctor --json
```

The package is a public scoped package as `@merekit/cli` and ships the `mere` bin from `dist/run.js` plus compiled app adapters under `adapters/`.

## License

MereKit CLI is open source under the Apache License, Version 2.0. See `LICENSE`.

Bundled third-party notices are listed in `THIRD_PARTY_NOTICES.md`.

The license covers the package code and documentation. It does not grant access to Mere hosted services, workspaces, accounts, credentials, customer data, platform operator permissions, or Mere/Sawfwair trademarks.

## Publish

The package publishes compiled runtime files, bundled adapters, docs, and the skill only. Source, tests, app repos, local state, and secrets are intentionally excluded from the package tarball.

```sh
pnpm check
pnpm test
pnpm smoke
pnpm pack:dry
pnpm test:pack
npm publish --access public
```

## Bundled Adapters

The package includes generated public client artifacts under `adapters/` so the CLI works from npm without separate product CLI installs. These artifacts intentionally expose command names, public API route shapes, environment variable names, and default service URLs; they do not contain credentials or grant service access. Mere services remain responsible for authentication, workspace membership, roles, confirmations, and server-side authorization.

Maintainers can regenerate adapters with `pnpm build:adapters` when the private app repositories are available as sibling directories. Public contributors do not need that step for normal root CLI development.

`mere` delegates product behavior to app CLI adapters. A globally installed root CLI resolves delegated app CLIs in this order:

1. Explicit env overrides such as `MERE_PROJECTS_CLI` or `MERE_FINANCE_CLI`.
2. Bundled adapters inside `@merekit/cli`, such as `adapters/projects/run.js`.
3. Local repo paths under `MERE_ROOT`, defaulting to the parent of the installed package root.
4. App binaries on `PATH`, such as `mere-projects`, `mere-zone`, or `merefi`.

Use `MERE_CLI_SOURCE=auto|bundled|local|path` to force a source for debugging. App-local bins remain internal/dev escape hatches; normal operation should work from the npm package alone.

## Command Plane

Root-owned commands:

- `mere apps list|manifest|doctor`
- `mere agent bootstrap`
- `mere auth login|whoami|logout|status`
- `mere context get|set-workspace|clear`
- `mere finance profiles list|current|use`
- `mere setup build|check|smoke`
- `mere ops doctor|smoke|audit|workspace-snapshot`
- `mere mcp serve`
- `mere help agent|safety|mcp`

Delegated commands use `mere <app> ...`:

```sh
mere projects project list --workspace ws_123 --json
mere today booking list --tenant ten_123 --remote --json
mere zone stripe status --store str_123 --json
mere network diagnostics metrics --workspace ws_123 --json
```

The root only passes flags a target manifest supports. Use `mere apps manifest --app APP --json` to discover exact command paths, risk levels, flags, JSON support, data support, and destructive guardrails.

Registered namespaces:

| Namespace | Auth | Purpose |
| --- | --- | --- |
| `business` | browser | Business product/workspace operations |
| `finance` | token | Scoped finance automation |
| `projects` | browser | Project, contact, knowledge, proposal, and source workflows |
| `today` | browser | Scheduling, booking, calendar, and time workflows |
| `zone` | browser | Store, product, order, Stripe, and checkout workflows |
| `video` | browser | Rooms, meetings, agents, diagnostics, recordings, and transcripts |
| `network` | browser | Calls, SMS, conversations, numbers, routing, deployments, diagnostics |
| `email` | browser | Mailboxes, threads, sending, providers, domains, drafts |
| `gives` | browser | Donation tenants, campaigns, receipts, Stripe, widgets, settings |

## Auth And Context

Browser-auth apps keep their own app-local sessions. Finance intentionally uses scoped token profiles, so root auth commands summarize profile/token state instead of launching browser auth.

Root context stores workspace defaults only:

```sh
mere context set-workspace --workspace ws_123
mere context get
```

`ops workspace-snapshot` uses the root default workspace when `--workspace` is omitted. For delegated product commands, keep passing explicit selectors unless the app command itself has a default session.

## Safety

Product CLIs remain authoritative for authentication, workspace switching, mutation semantics, and destructive guardrails. The root CLI never adds `--yes` or `--confirm` implicitly. MCP runs read-only by default; write/destructive tools require `mere mcp serve --allow-writes` or `MERE_MCP_ALLOW_WRITES=1`.

Root state lives at:

- `~/.config/mere/config.json`
- `~/.local/state/mere/state.json`
- `~/.local/state/mere/audit.ndjson`

Product tokens stay in each app-local session/profile store.

## Verification

```sh
pnpm build
pnpm check
pnpm test
pnpm smoke
node dist/run.js --help
node dist/run.js help agent
```

For deeper operating docs see:

- `docs/agent.md`
- `docs/commands.md`
- `docs/ops.md`
- `docs/mcp.md`
