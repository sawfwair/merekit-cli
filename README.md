# Mere CLI

[![CI](https://github.com/sawfwair/merekit-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/sawfwair/merekit-cli/actions/workflows/ci.yml)
[![Docs](https://github.com/sawfwair/merekit-cli/actions/workflows/docs.yml/badge.svg)](https://github.com/sawfwair/merekit-cli/actions/workflows/docs.yml)
[![npm](https://img.shields.io/npm/v/@merekit/cli.svg)](https://www.npmjs.com/package/@merekit/cli)
[![GitHub Release](https://img.shields.io/github/v/release/sawfwair/merekit-cli?sort=semver)](https://github.com/sawfwair/merekit-cli/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

`mere` is the portfolio command plane for Mere. It is the single entrypoint for humans and agents, while product behavior stays owned by app CLI adapters bundled inside this package. The root CLI adds discovery, context, audit logs, diagnostics, smoke checks, workspace snapshots, and MCP access.

Full docs are published at [sawfwair.github.io/merekit-cli](https://sawfwair.github.io/merekit-cli/). Public waitlist access is at [merekit.com/waitlist](https://merekit.com/waitlist).

```sh
mere tui
mere business waitlist join --email you@example.com
mere business onboard start INVITE_CODE --json
mere onboard --workspace ws_123 --target codex --json
mere apps list --json
mere ops doctor --json
mere auth status --all --json
mere ops workspace-snapshot --json
mere apps manifest --app projects --json
mere help agent
mere business waitlist join --email you@example.com --json
```

`mere business waitlist join` opens the Turnstile and magic-link protected page at [merekit.com/waitlist](https://merekit.com/waitlist) with the email prefilled. The page sends a confirmation link, and the link click performs the waitlist join. `mere tui` also accepts a waitlist email directly when someone does not have an invite yet.

## First Use

For a human first run, start the terminal UI:

```sh
mere tui
```

The UI asks for an invite code, waitlist email, or operator workspace ID. If someone does not have an invite yet, entering an email opens the protected waitlist. Workspace IDs are only for operators, support, agents, or re-running checks on an already-provisioned workspace. If you paste an invite code, it runs `mere business onboard start CODE --json` to sign in and bootstrap the workspace, then runs the same safe readiness checks as `mere onboard --json`. You can also launch it with:

```sh
mere onboard --interactive
```

For headless human onboarding from an invite code:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --target codex --json
```

For headless waitlist access before an invite exists:

```sh
mere business waitlist join --email you@example.com
```

Or open [merekit.com/waitlist](https://merekit.com/waitlist) directly.

Use this operator sequence when an agent or automation enters an already-provisioned workspace:

```sh
mere onboard --workspace ws_123 --target codex --json
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

For normal users, start with `mere tui` because it starts from the invite code they actually have, or from the waitlist email they need before an invite exists. For operators and agents that already have a workspace, `mere onboard --workspace ...` writes the bootstrap context pack plus `onboarding-report.json` and `ONBOARDING.md`, with readiness scores, selector hints, and exact next commands. The snapshot is the safest first operational read. It runs only manifest-declared read commands and groups results by app.

`agent bootstrap` wraps that first-use sequence and writes a secret-free context pack for an agent:

```txt
~/.config/mere/agents/default/
  AGENT.md
  bootstrap.json
  apps-list.json
  doctor.json
  auth-status.json
  finance-profiles.json
  context.json
  apps-manifest.json
  workspace-snapshot.json
  mcp.json
  command-reference.md
```

## Install

Requires Node.js `>=24 <26`.

Install the published package from npm:

```sh
npm install -g @merekit/cli
mere --help
mere tui
```

Run it once without a global install:

```sh
npx --yes @merekit/cli@latest --help
npx --yes @merekit/cli@latest tui
```

With pnpm:

```sh
pnpm add -g @merekit/cli
mere ops doctor --json
```

For development from this repository:

```sh
pnpm install
pnpm build
node dist/run.js --help
node dist/run.js help agent
```

The package is published as the public scoped package `@merekit/cli` and ships the `mere` bin from `dist/run.js` plus compiled app adapters under `adapters/`.

## Contributing

Issues and pull requests are welcome. Please read `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, and `SECURITY.md` before sending changes that affect adapters, auth flows, MCP behavior, package contents, or release scripts.

## License

MereKit CLI is open source under the Apache License, Version 2.0. See `LICENSE`. Project copyright is listed in `NOTICE`.

Bundled third-party notices are listed in `THIRD_PARTY_NOTICES.md`.

The license covers the package code and documentation. It does not grant access to Mere hosted services, workspaces, accounts, credentials, customer data, platform operator permissions, or Mere/Sawfwair trademarks.

## Publish

The package publishes compiled runtime files, bundled adapters, docs, and the repo-local `mere-cli` skill. Product and onboarding skill bodies are fetched from the centralized registry at `https://merekit.com/skills` with digest verification, so source, tests, app repos, local state, secrets, and non-CLI skill text are intentionally excluded from the package tarball.

Use `docs/release-checklist.md` for the full public-release preflight, including adapter safety, package contents, smoke checks, and secret scanning.
The manual `Publish` workflow uses npm Trusted Publishing through GitHub Actions OIDC. Configure `@merekit/cli` on npm with repository `sawfwair/merekit-cli`, workflow `publish.yml`, and environment `npm`.

```sh
pnpm check
pnpm test
pnpm smoke
pnpm pack:dry
pnpm test:pack
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
- `mere tui`
- `mere onboard`
- `mere agent bootstrap`
- `mere auth login|whoami|logout|status`
- `mere context get|set-workspace|clear`
- `mere finance profiles list|current|use|login`
- `mere setup build|check|smoke`
- `mere setup mere-run`
- `mere setup mere-run models --app media`
- `mere ops doctor|smoke|audit|workspace-snapshot`
- `mere mcp serve`
- `mere help agent|onboard|safety|mcp`

Delegated commands use `mere <app> ...`:

```sh
mere business waitlist join --email you@example.com --json
mere projects project list --workspace ws_123 --json
mere today booking list --tenant ten_123 --remote --json
mere zone stripe status --store str_123 --json
mere network diagnostics metrics --workspace ws_123 --json
mere works work list --workspace ws_123 --json
mere media items list --workspace ws_123 --json
mere media process ~/Audio/interview.m4a --transcribe --embed --workspace ws_123 --json
mere media --store local store info --json
mere link config init --workspace ws_123 --output mere.link.yaml
mere link context inspect workspace workspace --role work --json
```

The waitlist command is intentionally a browser handoff; it does not post the email directly from the root CLI process.

The root only passes flags a target manifest supports. Use `mere apps manifest --app APP --json` to discover exact command paths, risk levels, flags, JSON support, data support, and destructive guardrails.

Registered namespaces:

| Namespace | Auth | Purpose |
| --- | --- | --- |
| `business` | browser | Business product/workspace operations |
| `finance` | token | Scoped finance automation |
| `projects` | browser | Project, contact, knowledge, proposal, and source workflows |
| `agent` | browser | Agent foundation lifecycle, runtime sessions, share links, and generated tools |
| `today` | browser | Scheduling, booking, calendar, and time workflows |
| `zone` | browser | Store, product, order, Stripe, and checkout workflows |
| `video` | browser | Rooms, meetings, agents, diagnostics, recordings, and transcripts |
| `network` | browser | Calls, SMS, conversations, numbers, routing, deployments, diagnostics |
| `email` | browser | Mailboxes, threads, sending, providers, domains, drafts |
| `gives` | browser | Donation tenants, campaigns, receipts, Stripe, widgets, settings |
| `works` | browser | Work apps, data, releases, shares, capabilities, and surfaces |
| `media` | browser | Audio imports, transcripts, embeddings, media search, and local processing through `mere.run` |
| `deliver` | none | Password-gated delivery packages, Same Page payloads, and share URLs via Wrangler/D1 |
| `link` | none | YAML-based links between work surfaces; runs standalone or bootstraps from Mere workspace state |

`mere media` cloud and local-store reads work through the bundled media adapter. Local processing commands such as `mere media process ... --transcribe --embed` additionally require the public `mere.run` runtime and local models. Run `mere setup mere-run` to orchestrate runtime install from an existing binary, the local `~/mere/run-public` source checkout, or the verified DMG at `https://public.stereovoid.com/mere-run-releases/mere-run.dmg`. Then run `mere setup mere-run models --app media` to pull Media-requested models. Use `MERE_MEDIA_MERE_RUN_BIN` or `MERE_RUN_BIN` only for explicit runtime overrides.

`mere deliver` is backed by the Cloudflare Wrangler/D1 command surface for `share.mere.ink`. Set `WRANGLER_BIN="cfman personal wrangler"` when using cfman, or `MERE_DELIVER_WRANGLER_CONFIG=~/mere/deliver/wrangler.jsonc` when the bundled adapter needs the private Worker config.

`mere link` is intentionally usable without hosted Mere services. It is bundled into `@merekit/cli` for convenience and also ships as the standalone TypeScript package `@merekit/link` with the `mere-link` binary. It validates `mere.link.yaml`, resolves entity/project role surfaces, lists explicit links, and can generate starter YAML from `mere ops workspace-snapshot` when a workspace is available:

```sh
mere link config init --output mere.link.yaml
mere link generate workspace --workspace ws_123 --output mere.link.yaml --yes
mere link config validate --config mere.link.yaml
mere link surfaces list --config mere.link.yaml
mere link sync projects --config mere.link.yaml --json
```

`mere link sync projects` plans Mere Projects records and URL links from configured surfaces. It stays dry-run unless `--apply` is passed and the target Projects app surface explicitly allows `policy.writes: [sync]`. When a Link project includes a `mere` `record` surface, sync updates only Link attributes on that existing record before upserting links.

## Auth And Context

Browser-auth apps keep their own app-local sessions. Finance intentionally uses scoped token profiles, and `mere finance profiles login NAME --base-url https://<tenant>.mere.finance --json` provides the root-owned profile setup plus product auth handoff.

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
- `docs/release-checklist.md`
- `CHANGELOG.md`
