# Ops Workflows

Ops commands are root-owned read/check workflows for humans and agents. They prefer live app manifests and avoid mutation unless they are running explicit smoke scripts.

## Agent Bootstrap

```sh
mere onboard --workspace ws_123 --target codex --json
mere agent bootstrap --workspace ws_123 --target codex --json
```

`onboard` runs the first-use discovery path, writes an agent context pack with docs, manifests, auth status, doctor output, MCP config, and a workspace snapshot, then adds `onboarding-report.json` and `ONBOARDING.md` with readiness, remediation, and selector hints. `agent bootstrap` writes only the lower-level context pack.

## Doctor

```sh
mere ops doctor --json
```

Checks Node, pnpm, resolved CLI source/location, version command, completion, `commands --json`, and auth status.

Use this before cross-stack work. `authStatus` is a signal, not a hard failure for every app: Finance is token/profile based, and an unauthenticated Finance profile may be intentional until financial automation is needed.

## Auth Status

```sh
mere auth status --all --json
mere auth status --app finance --json
mere finance profiles list --json
mere finance profiles login default --base-url https://<tenant>.mere.finance --json
```

Browser-auth apps keep app-local sessions. Finance stores scoped token profiles in `~/.config/merefi/config.json`.

## Smoke

```sh
mere ops smoke --all --json
mere setup smoke --app projects
```

Runs each app's `smoke:cli` script from its repo.

## Audit

```sh
mere ops audit --workspace ws_123 --json
```

Loads app manifests and runs only commands marked `auditDefault` with read risk. This is intentionally read-only and safe for agent use.

## Workspace Snapshot

```sh
mere ops workspace-snapshot --workspace ws_123 --json
mere context set-workspace --workspace ws_123
mere ops workspace-snapshot --json
```

Builds a grouped cross-stack snapshot from the same read-only manifest commands as audit. It requires an explicit workspace or a default set with `mere context set-workspace --workspace ws_123`.

The snapshot adds selector help for route-backed read-only audits:

- Today: uses `auth whoami` and route-backed `tenant resolve --workspace WORKSPACE_ID`; D1-backed booking/time commands are not default audit commands.
- Zone: infers `--store` for `stripe status`.
- Gives: passes the workspace id as `--tenant`; Gives resolves it to the internal tenant.

## Reading A Snapshot

Each app entry has:

- `app`
- `namespace`
- `ok`
- `manifestOk`
- `coverage`
- `commands[]`

`coverage` reports how many read commands exist in the manifest, how many are marked as safe audit defaults, how many were executed, and which read commands were skipped because the app did not mark them `auditDefault`.

`selectorHints` reports the active workspace, inferred tenant/store selectors, and discovery commands for selectors that could not be inferred.

Each command entry has:

- `command`
- `ok`
- `code`
- `stdout`
- `stderr`
- optional `error`

Agents should summarize failures first, then inspect the failed delegated command directly.

## Reading Onboarding

`mere onboard --workspace ws_123 --json` produces:

- `readinessScore`
- `summary`
- `apps[]`
- `selectors`
- `remediation[]`
- `artifacts`

Treat `remediation[].nextCommand` as the copy-paste path for setup work. Browser auth, Finance auth, destructive actions, and skill installs are recommended but not run automatically.

## Common Remediation Patterns

Finance unauthenticated:

```sh
mere auth status --app finance --json
mere finance profiles list --json
mere finance profiles login default --base-url https://<tenant>.mere.finance --json
```

Workspace-specific product state:

```sh
mere ops workspace-snapshot --workspace ws_123 --app network --json
mere apps manifest --app network --json
mere network diagnostics metrics --workspace ws_123 --json
```

App route/selector uncertainty:

```sh
mere apps manifest --app APP --json
mere <app> <safe-list-command> --workspace ws_123 --json
```

Do not use destructive commands from an ops workflow unless a user explicitly asks for that operation and provides or approves the exact guardrails.
