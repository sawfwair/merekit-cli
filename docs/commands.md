# Command Reference

The root CLI exposes a small set of root-owned commands and delegates all product behavior to bundled or overridden app CLI adapters. For exact product command paths, always prefer the live manifest:

```sh
mere apps manifest --app APP --json
```

## Root Commands

- `mere --help`, `mere help [agent|onboard|safety|skills|mcp]`, `mere --version`, `mere completion [bash|zsh|fish]`
- `mere tui [--waitlist-email EMAIL | --invite-code CODE | --workspace ID for operators] [--app APP] [--target codex|claude] [--output DIR]`
- `mere onboard [--interactive] [--invite-code CODE | --workspace ID for operators] [--app APP] [--target codex|claude] [--output DIR] [--finance-profile NAME] [--finance-base-url URL] [--json]`
- `mere agent bootstrap [--workspace ID] [--app APP] [--target codex] [--output DIR] [--allow-writes] [--json]`
- `mere apps list|manifest|doctor [--app APP] [--json]`
- `mere context get|set-workspace|clear`
- `mere setup build|check|smoke (--app APP|--all) [--json]`
- `mere auth login|whoami|logout|status (--app APP|--all) [--json]`
- `mere finance profiles list|current|use|login [--json]`
- `mere ops doctor|smoke|audit|workspace-snapshot [--app APP] [--workspace ID] [--json]`
- `mere mcp serve [--allow-writes]`

## First-Use Commands

Human TUI:

```sh
mere tui
```

Waitlist before an invite exists:

```sh
mere business waitlist join --email you@example.com
mere tui --waitlist-email you@example.com
```

Headless invite bootstrap:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --target codex --json
```

Operator/agent workspace entry:

```sh
mere onboard --workspace ws_123 --target codex --json
mere agent bootstrap --workspace ws_123 --target codex --json
mere apps list --json
mere ops doctor --json
mere auth status --all --json
mere finance profiles list --json
mere context set-workspace --workspace ws_123
mere ops workspace-snapshot --json
mere apps manifest --app projects --json
```

`mere tui` is the recommended human entrypoint. Normal users start with an invite code or, before they have one, a waitlist email. A waitlist email opens the protected `mere business waitlist join --email ...` browser handoff. An invite code runs `mere business onboard start INVITE_CODE --json`. Workspace IDs are for operators, support, agents, automation, or re-running checks on an already-provisioned workspace.

`onboard` writes the bootstrap context pack plus `onboarding-report.json` and `ONBOARDING.md`. `agent bootstrap` is the lower-level reusable context-pack primitive. The default output is `~/.config/mere/agents/default`; use `--output DIR` for project-local or test-specific packs. The generated `mcp.json` defaults to read-only MCP and only includes write mode when `--allow-writes` is explicitly passed.

## Installable Package

`@merekit/cli` ships the `mere` bin from `dist/run.js`. The package includes compiled root CLI files, bundled app adapters, docs, and the repo-local `mere-cli` skill. Product and onboarding skill bodies are kept in the centralized Mere skill registry and fetched with digest verification by `mere skills install`.

Publish/install flow:

```sh
pnpm check
pnpm test
pnpm smoke
pnpm pack:dry
pnpm test:pack
npm publish --access public
npm install -g @merekit/cli
```

Adapter regeneration is maintainer-only and requires the private Mere app repositories as sibling directories. Public contributors do not need `pnpm build:adapters` for normal root CLI development.

Delegated app CLI resolution order:

1. Env override, for example `MERE_PROJECTS_CLI=/path/to/run.js`.
2. Bundled adapter under the installed `@merekit/cli/adapters/` directory.
3. Local repo path under `MERE_ROOT`.
4. App binary on `PATH`.

Use `MERE_CLI_SOURCE=auto|bundled|local|path` to force a source when debugging installed/package behavior.

## Delegated Commands

The first positional app name delegates to that app:

```sh
mere business waitlist join --email you@example.com --json
mere business workspace current --json
mere auth status --app finance --json
mere finance profiles list --json
mere finance profiles use books --base-url https://<tenant>.mere.finance --json
mere finance profiles login books --base-url https://<tenant>.mere.finance --json
mere finance reports trial-balance --json
mere projects project list --json
mere today booking list --tenant ten_1 --json
mere zone orders list --store store_1 --json
mere video rooms list --json
mere network calls list --json
mere email threads search invoice --json
mere gives donations list --tenant ten_1 --json
mere works work list --workspace ws_123 --json
```

The business waitlist command opens a Turnstile and magic-link protected browser page with the email prefilled; the CLI does not submit the email directly.

Global pass-through flags are only forwarded when the target manifest supports them:

- `--workspace`
- `--base-url`
- `--profile`
- `--json`
- `--yes`
- `--confirm`
- `--data`
- `--data-file`

Additional app selectors such as `--tenant`, `--store`, `--remote`, `--local`, `--db`, and `--persist-to` are also passed when the app manifest exposes them.

Destructive commands keep the app-local contract, typically `--yes --confirm <exact-target>`.

Video browser-host commands such as `video agent join --runtime browser` and `video recordings start` are packaged, but launching the browser requires Playwright in the same npm prefix as `@merekit/cli`:

```sh
npm install -g @merekit/cli @playwright/test
```

## Manifest Contract

Each app CLI exposes:

```sh
mere <app> commands --json
mere apps manifest --app <app> --json
```

The merged root manifest includes:

- `schemaVersion`
- `app`
- `namespace`
- `aliases`
- `auth.kind`
- `baseUrlEnv`
- `sessionPath`
- `globalFlags`
- `commands[]`

Each command includes:

- `id`
- `path`
- `summary`
- `auth`
- `risk`
- `supportsJson`
- `supportsData`
- `requiresYes`
- `requiresConfirm`
- `positionals`
- `flags`
- optional `auditDefault`

Agents should treat this as the source of truth. Do not guess command names or guardrail requirements.

## Current App Surface

This matrix is generated from the current local app manifests.

| Namespace | Commands | Audit Defaults | Risk Summary | Global Flags |
| --- | ---: | ---: | --- | --- |
| `business` | 138 | 2 | 52 read, 59 write, 15 destructive, 12 external | `workspace`, `json`, `yes`, `confirm` |
| `finance` | 38 | 2 | 27 read, 7 write, 4 destructive | `base-url`, `profile`, `json`, `yes`, `confirm` |
| `projects` | 47 | 4 | 21 read, 18 write, 8 destructive | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file` |
| `today` | 58 | 2 | 25 read, 22 write, 10 destructive, 1 external | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file`, `tenant`, `remote`, `local`, `db`, `persist-to` |
| `zone` | 29 | 5 | 16 read, 8 write, 3 external, 2 destructive | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file`, `store` |
| `video` | 33 | 7 | 25 read, 4 write, 1 destructive, 3 external | `base-url`, `workspace`, `json`, `yes`, `confirm` |
| `network` | 58 | 6 | 25 read, 16 write, 9 destructive, 8 external | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file` |
| `email` | 31 | 4 | 16 read, 10 write, 3 destructive, 2 external | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file` |
| `gives` | 40 | 6 | 24 read, 11 write, 5 destructive | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file`, `tenant` |
| `works` | 40 | 0 | 15 read, 20 write, 4 destructive, 1 external | `base-url`, `workspace`, `json`, `yes`, `confirm`, `data`, `data-file`, `token` |

## Output And Exit Codes

Root-owned commands emit structured JSON with `--json`. Delegated commands preserve app stdout, stderr, and exit code. Some app CLIs return text for historical commands even when `--json` is present; agents should parse JSON only when the command output is valid JSON.

Root audit logging redacts tokens from recorded metadata and captured root summaries.
