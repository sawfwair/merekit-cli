# Getting Started

Mere CLI is easiest to learn as a guided first-use loop: install the public package, join the waitlist or redeem an invite through interactive onboarding when needed, inspect the generated report, then use manifests and snapshots before invoking product commands.

## Install

No global install required:

```sh
npx --yes --ignore-scripts @merekit/cli@latest --help
npx --yes @merekit/cli@latest onboard --interactive
```

Persistent `mere` command:

```sh
npm install -g --ignore-scripts @merekit/cli
mere --help
```

If stock macOS npm reports `EACCES` under `/usr/local/lib/node_modules`, use `npx` or set a user-owned prefix such as `~/.local` and add `~/.local/bin` to `PATH`.

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
mere onboard --interactive
```

The interactive onboarding flow asks for an invite code, waitlist email, or operator workspace ID. Waitlist emails open the protected sign-up handoff, invite codes are redeemed through `mere business onboard start CODE --json`, and workspace IDs are an operator/support/agent path for re-running the safe onboarding report against an already-provisioned workspace.

If you do not have an invite yet:

```sh
mere business waitlist join --email you@example.com
mere onboard --interactive --waitlist-email you@example.com
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

If you need platform or product docs and do not have local app repositories:

```sh
mere docs login
mere docs search "site cms assist" --app business --json
mere docs read business/site-cms --json
```

The docs command uses the hosted `mere-docs.mere.world` API and requires broker auth or a docs-scoped `MERE_DOCS_TOKEN`.

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
Use `mere docs search` and `mere docs read` when the manifest shows a command but you need workflow context or examples.

For customer workspace and website operations, switch to the Business lifecycle surface:

```sh
mere business workspace status --workspace WORKSPACE_ID --json
mere business site status --workspace WORKSPACE_ID --json
mere business site import-existing --workspace WORKSPACE_ID --url https://example.com --json
mere business site bundle status --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --json
```

See [Business Workspace And Site Lifecycle](/business-site) for existing-site import, net-new site requests, CMS/media/revision operations, publishing, static bundles, and direct `mere dynasite` recovery commands.

## Keep Going

- [Onboarding overview](/onboarding/)
- [First run walkthrough](/onboarding/first-run)
- [Hosted product docs](/product-docs)
- [Troubleshooting onboarding](/onboarding/troubleshooting)
