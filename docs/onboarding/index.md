# Onboarding Overview

`mere onboard` is the user-facing entrypoint for a new human or agent. It creates one readiness report, one readable summary, and one reusable context pack before any product mutation happens.

It is intentionally conservative. It discovers app adapters, checks manifests, summarizes auth state, stores the workspace when provided, runs safe read-only snapshot commands, and writes exact next commands for anything that still needs setup.

## The Onboarding Path

<div class="mere-path">
  <div class="mere-step">
    <strong>1. Resolve app CLIs</strong>
    <span>Find bundled, local, env-overridden, or PATH-based app command adapters.</span>
  </div>
  <div class="mere-step">
    <strong>2. Collect state</strong>
    <span>Run doctor, auth status, Finance profile checks, context reads, and app manifests.</span>
  </div>
  <div class="mere-step">
    <strong>3. Write next steps</strong>
    <span>Create <code>ONBOARDING.md</code>, <code>onboarding-report.json</code>, and the agent context pack.</span>
  </div>
</div>

## Recommended First Run

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

For one app:

```sh
mere onboard --app projects --workspace WORKSPACE_ID --target codex --json
```

For Claude-targeted onboarding material:

```sh
mere onboard --workspace WORKSPACE_ID --target claude --json
```

For a project-local output directory:

```sh
mere onboard --workspace WORKSPACE_ID --output .mere/onboarding --json
```

## What Onboarding Does

- Runs `mere apps list --json`.
- Runs `mere ops doctor --json`.
- Runs `mere auth status --all --json`, or app-scoped status when `--app` is passed.
- Runs `mere finance profiles list --json`.
- Reads root context with `mere context get`.
- Loads the command manifest with `mere apps manifest --json`.
- Runs `mere ops workspace-snapshot --workspace WORKSPACE_ID --json` when a workspace is selected.
- Writes a context pack and onboarding report.
- Saves the workspace as the root default when `--workspace` is provided.

## What Onboarding Does Not Do

<div class="mere-callout">
Onboarding recommends setup commands, but it does not perform browser login, Finance token login, skill installation, write commands, destructive commands, refunds, releases, or external side effects.
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
| `--workspace ID` | Selects and stores the workspace for root-owned workflows such as `workspace-snapshot`. |
| `--app APP` | Limits checks and manifests to one app namespace. |
| `--target codex|claude` | Selects the target for generated agent-facing guidance and skill install commands. |
| `--output DIR` | Writes the context pack to a custom directory instead of the default agent path. |
| `--finance-profile NAME` | Names the Finance token profile recommended in remediation. |
| `--finance-base-url URL` | Uses a concrete Finance base URL in remediation commands. |
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
