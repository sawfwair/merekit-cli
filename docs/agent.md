# Agent First Use

This runbook teaches a new agent how to operate Mere through the root `mere` command plane without prior repo knowledge.

## Mental Model

`mere` is a command router and safety layer. It does not reimplement product logic. It discovers bundled or overridden app CLI manifests, delegates commands, preserves exit codes, records redacted audit metadata, and exposes the same manifest-backed surface through MCP.

Use read-only discovery first. Mutate only after a manifest confirms the command path, required selectors, data support, and destructive guardrails.

## Installation Model

`@merekit/cli` can be installed as a public npm package:

```sh
npm install -g @merekit/cli
mere --help
```

The npm package contains the root command plane, docs, the repo-local `mere-cli` skill, and compiled app CLI adapters. Product and onboarding skill bodies live in the centralized registry at `https://merekit.com/skills` and are installed on demand with digest verification. A global `mere` install resolves app CLIs from env overrides, bundled adapters, local Mere repo paths, or app binaries on `PATH`.

For full cross-stack operation, make sure `mere apps list --json` reports the target app CLIs as ready. Installed users should normally see `source: "bundled"`; use `MERE_CLI_SOURCE=bundled` to simulate a fresh machine without local repos.

## First-Use Sequence

```sh
npm install -g @merekit/cli
mere onboard --workspace WORKSPACE_ID --target codex --json
mere agent bootstrap --workspace WORKSPACE_ID --target codex --json
```

`onboard` is the shortest safe first move for humans and agents. It runs discovery/check/status commands, stores the workspace when provided, writes a secret-free context pack under `~/.config/mere/agents/default` unless `--output DIR` is passed, and adds a readiness report with exact next commands. `agent bootstrap` remains the lower-level context-pack primitive.

Generated files:

- `AGENT.md`
- `bootstrap.json`
- `apps-list.json`
- `doctor.json`
- `auth-status.json`
- `finance-profiles.json`
- `context.json`
- `apps-manifest.json`
- `workspace-snapshot.json`
- `mcp.json`
- `command-reference.md`
- `onboarding-report.json`
- `ONBOARDING.md`

Manual sequence:

```sh
mere --help
mere help onboard
mere help agent
mere onboard --workspace WORKSPACE_ID --target codex --json
mere apps list --json
mere ops doctor --json
mere auth status --all --json
mere finance profiles list --json
mere finance profiles login default --base-url https://<tenant>.mere.finance --json
mere context set-workspace --workspace WORKSPACE_ID
mere ops workspace-snapshot --json
mere apps manifest --app APP --json
```

Interpretation:

- `apps list` tells you which app adapters are resolved and from which source.
- `ops doctor` checks build presence, version, completion, manifest validity, and auth state.
- `auth status --all` summarizes app sessions. Finance is token/profile based and may be intentionally unauthenticated.
- `context set-workspace` stores a root default for root-owned workflows such as `workspace-snapshot`.
- `workspace-snapshot` is the safest cross-stack operational read.
- `apps manifest` is the source of truth for exact product commands.
- `onboarding-report.json` groups readiness, blockers, selector hints, and remediation commands.

## Operating Loop

1. Start with `mere ops workspace-snapshot --workspace WORKSPACE_ID --json`.
2. Identify the app and workflow that needs attention.
3. Run `mere apps manifest --app APP --json`.
4. Find the command entry and inspect `risk`, `flags`, `supportsJson`, `supportsData`, `requiresYes`, and `requiresConfirm`.
5. Run the delegated command with explicit selectors and `--json`.
6. For structured mutations, prefer `--data-file FILE` over long inline JSON.
7. For destructive commands, pass only the guardrails the user explicitly approved.

## Delegation Rules

```sh
mere <app> <app-command> [flags]
```

Examples:

```sh
mere projects project list --workspace ws_123 --json
mere today booking list --tenant ten_123 --remote --json
mere zone stripe status --store str_123 --json
mere network diagnostics metrics --workspace ws_123 --json
mere gives campaigns list --tenant ws_123 --json
```

Root pass-through flags are filtered by manifest support:

- `--workspace`
- `--base-url`
- `--profile`
- `--json`
- `--yes`
- `--confirm`
- `--data`
- `--data-file`
- app-specific selectors such as `--tenant`, `--store`, `--remote`

Unsupported flags are not forwarded. If a command needs an app-specific selector, discover it from the manifest or from a safe list command.

## Source Resolution

Resolution order is:

1. Env override, for example `MERE_PROJECTS_CLI=/path/to/run.js`.
2. Bundled adapter, for example `adapters/projects/run.js`.
3. Local repo dist under `MERE_ROOT`.
4. App binary on `PATH`.

`MERE_CLI_SOURCE=auto|bundled|local|path` forces a source for debugging. App-local CLIs are internal/dev escape hatches; agents should prefer the installed `mere` command and live manifests.

Video browser-host commands are present in the bundled adapter, but actually launching the browser requires Playwright in the same npm prefix as `@merekit/cli`. Read-only Video diagnostics and room/meeting operator commands do not require it.

## Workspace Snapshot Notes

`workspace-snapshot` adds a small amount of root-owned selector help for the read-only audit path:

- Today defaults to `auth whoami` and route-backed `tenant resolve`; local/remote D1 tenant, booking, and time commands stay out of default snapshots.
- Zone audit reads infer `--store` from `store list` for Stripe status.
- Gives audit reads pass the workspace id as `--tenant`; Gives canonicalizes it to the internal tenant.

This inference is for root-owned read-only ops workflows. Product mutations remain explicit.

## Safety Contract

- The root CLI never invents `--yes`.
- The root CLI never invents `--confirm`.
- Destructive app commands remain app-authoritative.
- MCP is read-only by default.
- Write-capable MCP requires `mere mcp serve --allow-writes` or `MERE_MCP_ALLOW_WRITES=1`.
- Audit metadata is appended to `~/.local/state/mere/audit.ndjson`.
- Product secrets stay in app-local session/profile stores.

## MCP For Agents

Start read-only:

```sh
mere mcp serve
```

Start write-capable only when the task explicitly needs writes:

```sh
mere mcp serve --allow-writes
```

Tool names are generated from manifests, for example:

- `mere_projects_project_list`
- `mere_zone_stripe_status`
- `mere_network_diagnostics_metrics`
- `mere_gives_campaigns_list`

Tool inputs include `args`, `workspace`, `baseUrl`, `profile`, `json`, `data`, `dataFile`, `yes`, and `confirm`.

## Common Next Actions

Finance unauthenticated:

```sh
mere auth status --app finance --json
mere finance profiles list --json
mere finance profiles login default --base-url https://<tenant>.mere.finance --json
```

Cross-stack workspace read:

```sh
mere ops workspace-snapshot --workspace ws_123 --json
```

Find safe audit commands:

```sh
mere apps manifest --json
```

Then inspect commands where `auditDefault` is true and `risk` is `read`.
Snapshot entries also include `coverage`, which lists read commands that were skipped because they are not app-declared audit defaults.
