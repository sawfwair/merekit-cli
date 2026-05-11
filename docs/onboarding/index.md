# Onboarding Overview

`mere onboard --interactive` is the human entrypoint for waitlist access, invite-code onboarding, and operator workspace handoff. Workspace IDs are for operators, support, agents, automation, or re-running checks on an already-provisioned workspace. `mere onboard` is the headless readiness entrypoint after a workspace exists. Together they create one readiness report, one readable summary, and one reusable context pack before any product mutation happens.

It is intentionally conservative. It discovers app adapters, checks manifests, summarizes auth state, stores the workspace when provided, runs safe read-only snapshot commands, and writes exact next commands for anything that still needs setup. Write, destructive, external, and structured-data commands stay in the normal CLI or MCP flow where manifest-declared gates such as `--yes`, `--confirm`, structured data, and write-enabled MCP are explicit.

## The Onboarding Path

<div class="mere-path">
  <div class="mere-step">
    <strong>1. Start interactive onboarding</strong>
    <span>Use <code>mere onboard --interactive</code> to join the waitlist before an invite exists, redeem an invite code, or provide an operator workspace ID.</span>
  </div>
  <div class="mere-step">
    <strong>2. Collect state</strong>
    <span>Resolve app CLIs, run doctor, auth status, Finance profile checks, context reads, and app manifests.</span>
  </div>
  <div class="mere-step">
    <strong>3. Write next steps</strong>
    <span>Create <code>ONBOARDING.md</code>, <code>onboarding-report.json</code>, and the agent context pack.</span>
  </div>
</div>

## Recommended First Run

For humans:

```sh
mere onboard --interactive
```

For protected waitlist access before an invite exists:

```sh
mere business waitlist join --email you@example.com
```

For headless invite redemption and workspace bootstrap:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --target codex --json
```

For operators, agents, or automation after a workspace exists:

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

For one app after a workspace exists:

```sh
mere onboard --app projects --workspace WORKSPACE_ID --target codex --json
```

For Claude-targeted onboarding material after a workspace exists:

```sh
mere onboard --workspace WORKSPACE_ID --target claude --json
```

For a project-local output directory after a workspace exists:

```sh
mere onboard --workspace WORKSPACE_ID --output .mere/onboarding --json
```

## CLI Discovery

Use normal CLI commands after first use when you want a compact read-first view over the root command plane:

- Readiness: run or review `mere onboard`, `ONBOARDING.md`, and `onboarding-report.json`.
- Snapshot and diagnostics: inspect app resolution, doctor output, auth status, context, and safe workspace reads.
- Command discovery: use `mere apps manifest --json`; commands are nested by surface under `apps[].surfaces`.
- Skills: list, show, and install registry skills with `mere skills`.

## What Invite Bootstrap Does

Before an invite exists, open the protected waitlist browser handoff:

```sh
mere business waitlist join --email you@example.com
```

The waitlist page uses Turnstile plus an email magic link before the signup is captured.

When the user starts from an invite code, interactive onboarding runs:

```sh
mere business onboard start INVITE_CODE --json
```

That delegated Business command validates the invite, signs in or signs up through the browser when needed, creates/provisions the workspace, and returns workspace state for the root readiness pass.

## What Root Onboarding Does

- Runs `mere apps list --json`.
- Runs `mere ops doctor --json`.
- Runs `mere auth status --all --json`, or app-scoped status when `--app` is passed.
- Runs `mere finance profiles list --json`.
- Reads root context with `mere context get`.
- Loads the command manifest with `mere apps manifest --json`.
- Runs `mere ops workspace-snapshot --workspace WORKSPACE_ID --json` when a workspace is selected.
- Writes a context pack and onboarding report.
- Saves the workspace as the root default when `--workspace` is provided.

## What Root Onboarding Does Not Do

<div class="mere-callout">
The root `mere onboard` command recommends setup commands, but it does not perform browser login, Finance token login, skill installation, write commands, destructive commands, refunds, releases, or external side effects.
</div>

The root CLI never invents `--yes` or `--confirm`. Product CLIs keep their own guardrails.

## Generated Files

Default output:

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
  onboarding-report.json
  ONBOARDING.md
```

Start with `ONBOARDING.md` if you are reading. Start with `onboarding-report.json` if you are automating.

## Onboarding Inputs

| Flag | Purpose |
| --- | --- |
| `--waitlist-email EMAIL` | Interactive onboarding shortcut that opens the protected waitlist browser handoff through `mere business waitlist join --email EMAIL`. |
| `--invite-code CODE` | Interactive onboarding shortcut that starts from a Mere invite code and runs `mere business onboard start CODE --json`. |
| `--workspace ID` | Operator/agent path that selects and stores an already-provisioned workspace for root-owned workflows such as `workspace-snapshot`. |
| `--app APP` | Limits checks and manifests to one app namespace. |
| `--target codex\|claude` | Selects the target for generated agent-facing guidance and skill install commands. |
| `--output DIR` | Writes the context pack to a custom directory instead of the default agent path. |
| `--finance-profile NAME` | Names the Finance token profile recommended in remediation. |
| `--finance-base-url URL` | Uses a concrete Finance base URL in remediation commands. |
| `--interactive` | Opens first-use CLI prompts instead of printing the report directly. |
| `--json` | Prints the structured onboarding report to stdout. |

## After Onboarding

1. Read `ONBOARDING.md`.
2. Run the first blocking `remediation[].nextCommand`, if any.
3. Run `mere ops workspace-snapshot --workspace WORKSPACE_ID --json`.
4. Use `mere apps manifest --app APP --json` before delegated product commands.
5. Start MCP read-only with `mere mcp serve` when an agent needs tools.

## Related Pages

- [Install](/onboarding/install)
- [First run](/onboarding/first-run)
- [Read the report](/onboarding/report)
- [Agent context pack](/onboarding/context-pack)
- [Troubleshooting](/onboarding/troubleshooting)
