# Getting Started

Mere CLI is easiest to learn as a read-first loop: install the public package, run onboarding, inspect the generated report, then use manifests and snapshots before invoking product commands.

## Install

```sh
npm install -g @merekit/cli
mere --help
```

With pnpm:

```sh
pnpm add -g @merekit/cli
mere ops doctor --json
```

From this repository:

```sh
pnpm install
pnpm build
node dist/run.js --help
```

## Run The First Command

If you have a Mere workspace id:

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

If you are only checking local package health:

```sh
mere apps list --json
mere ops doctor --json
```

`mere onboard` is still useful without a workspace, but it will mark workspace-scoped apps as blocked and tell you the exact command to rerun:

```sh
mere onboard --workspace WORKSPACE_ID --json
```

## What You Get

By default, onboarding writes to `~/.config/mere/agents/default/`.

The most useful files are:

- `ONBOARDING.md`: readable status, readiness, and next steps.
- `onboarding-report.json`: structured readiness report for automation.
- `apps-manifest.json`: exact command surface for all selected apps.
- `workspace-snapshot.json`: safe read-only workspace state when a workspace is selected.
- `mcp.json`: read-only MCP server config.
- `AGENT.md`: operating guide for an agent entering the workspace.

## The Daily Loop

```sh
mere ops workspace-snapshot --workspace WORKSPACE_ID --json
mere apps manifest --app projects --json
mere projects project list --workspace WORKSPACE_ID --json
```

Use `workspace-snapshot` for the safest broad read. Use `apps manifest` before a delegated command so you can confirm the command path, required selectors, risk level, JSON/data support, and destructive guardrails.

## Keep Going

- [Onboarding overview](/onboarding/)
- [First run walkthrough](/onboarding/first-run)
- [Troubleshooting onboarding](/onboarding/troubleshooting)
