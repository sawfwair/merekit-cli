# First Run

The first run should produce evidence, not changes. Start with onboarding, then use the generated report to decide what to set up next.

## Run Onboarding

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

This writes the context pack and prints the structured report. If you prefer a readable terminal summary, omit `--json`:

```sh
mere onboard --workspace WORKSPACE_ID --target codex
```

For one app:

```sh
mere onboard --app projects --workspace WORKSPACE_ID --target codex --json
```

For a custom output directory:

```sh
mere onboard --workspace WORKSPACE_ID --output .mere/onboarding --json
```

## Read The First Result

Open the generated `ONBOARDING.md` first. It contains:

- Overall status: `Ready`, `Needs attention`, or `Blocked`.
- Overall readiness score.
- Active workspace or `not selected`.
- One row per app with status, readiness, and the next command.
- Skill install commands for the onboarding agent skill.

Use `onboarding-report.json` when you need structured fields such as `summary`, `apps`, `selectors`, `remediation`, and `artifacts`.

## If A Workspace Is Missing

Onboarding can run without a workspace, but workspace-scoped apps will be blocked. Rerun with a workspace:

```sh
mere onboard --workspace WORKSPACE_ID --json
```

When a workspace is present, onboarding stores it as the root default. Root-owned workflows can then use it:

```sh
mere context get
mere ops workspace-snapshot --json
```

For delegated app commands, keep passing explicit selectors until the app command itself documents a default.

## If Auth Is Missing

Browser-auth apps keep app-local browser sessions. Onboarding reports missing browser auth as a warning and gives the app-specific login command.

Finance uses scoped token profiles instead of browser auth. A typical Finance remediation looks like:

```sh
mere finance profiles login default --base-url https://<tenant>.mere.finance --json
```

If you already know the profile and base URL, make the recommendation concrete:

```sh
mere onboard --app finance --workspace WORKSPACE_ID --finance-profile books --finance-base-url https://finance.example.com --json
```

## Inspect Before Product Commands

After onboarding:

```sh
mere ops workspace-snapshot --workspace WORKSPACE_ID --json
mere apps manifest --app projects --json
```

Only then run a delegated command:

```sh
mere projects project list --workspace WORKSPACE_ID --json
```

The manifest tells you the exact command path, `risk`, supported flags, JSON support, data support, and whether `--yes` or `--confirm` is required.

## Use MCP Read-Only

For agents, start MCP in read-only mode first:

```sh
mere mcp serve
```

Write-capable tools require an explicit restart:

```sh
mere mcp serve --allow-writes
```

Do that only when the task explicitly needs writes.
