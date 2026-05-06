# First Run

The first run has two intentional public setup paths. Before an invite exists, join the protected waitlist through a browser handoff. When the user has an invite code, redeem the invite and create or provision the workspace. After that, onboarding should produce evidence, not product changes. Operators, agents, and automation that already have a workspace can start directly with the read-first readiness report.

## Run Onboarding

For a human first run:

```sh
mere tui
```

This asks for an invite code, waitlist email, or operator workspace ID. The paths are exclusive:

- Waitlist email: the UI runs `mere business waitlist join --email EMAIL`. That opens the Turnstile and magic-link protected browser handoff. It does not submit the email directly from the CLI.
- Invite code: the UI runs `mere business onboard start CODE --json` first. That command signs in or signs up through the browser when needed, bootstraps the workspace, and waits for provisioning unless you pass `--no-wait`.
- Operator workspace ID: the UI skips invite redemption and runs the root readiness report directly.

You can also launch the same UI through:

```sh
mere onboard --interactive
```

For a headless invite-code flow:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --target codex --json
```

For a headless waitlist handoff before an invite exists:

```sh
mere business waitlist join --email you@example.com
```

For an operator, agent, or headless shell entering an already-provisioned workspace:

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

This writes the context pack and prints the structured report. If you prefer a readable terminal summary, omit `--json`:

```sh
mere onboard --workspace WORKSPACE_ID --target codex
```

For one app after a workspace exists:

```sh
mere onboard --app projects --workspace WORKSPACE_ID --target codex --json
```

For a custom output directory after a workspace exists:

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
