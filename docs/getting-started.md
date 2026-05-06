# Getting Started

Mere CLI is easiest to learn as a guided first-use loop: install the public package, join the waitlist or redeem an invite through the TUI when needed, inspect the generated report, then use manifests and snapshots before invoking product commands.

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

For a human first run:

```sh
mere tui
```

The TUI asks for an invite code, waitlist email, or operator workspace ID. Waitlist emails open the protected sign-up handoff, invite codes are redeemed through `mere business onboard start CODE --json`, and workspace IDs are an operator/support/agent path for re-running the safe onboarding report against an already-provisioned workspace.

If you do not have an invite yet:

```sh
mere business waitlist join --email you@example.com
mere tui --waitlist-email you@example.com
```

For a headless invite-code flow:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --target codex --json
```

If you are an operator or agent with a Mere workspace ID:

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

If you are only checking local package health:

```sh
mere apps list --json
mere ops doctor --json
```

Operators can run `mere onboard` without a workspace as a package-health check, but workspace-scoped apps will be blocked and the report will tell you the exact command to rerun:

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
