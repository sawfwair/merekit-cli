# Read The Report

`mere onboard --json` prints the same structured report that it writes to `onboarding-report.json`.

Before an invite exists, there is no onboarding report yet. Use the protected waitlist handoff:

```sh
mere business waitlist join --email you@example.com
```

For a normal invite-code first run after the waitlist handoff, create or provision the workspace first:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --json
```

The report is designed to answer three questions:

1. Can this install see the app CLIs?
2. Does the selected workspace have enough readable state to proceed?
3. What exact command should the user or agent run next?

## Top-Level Shape

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-05-03T12:00:00.000Z",
  "ok": true,
  "readinessScore": 85,
  "workspace": "ws_123",
  "target": "codex",
  "outputDir": "~/.config/mere/agents/default",
  "summary": {},
  "apps": [],
  "selectors": {},
  "remediation": [],
  "artifacts": {},
  "files": {}
}
```

## Readiness Score

Each app starts at `100`.

- Each blocker subtracts `35`.
- Each warning subtracts `15`.
- The app score never goes below `0`.
- If blockers exist, app status is `blocked`.
- If no blockers but warnings exist, app status is `needs_attention`.
- If neither blockers nor warnings exist, app status is `ready`.

The top-level `readinessScore` is the rounded average across selected apps.

## `summary`

`summary` gives a quick rollup:

| Field | Meaning |
| --- | --- |
| `ready` | Number of selected apps with no blockers or warnings. |
| `blocked` | Number of selected apps with at least one blocker. |
| `needsAuth` | Number of auth remediation items. |
| `needsSelector` | Workspace or selector problems. |
| `needsInstall` | Missing adapter problems. |
| `optional` | Optional selector hints that were not inferred. |

## `apps[]`

Each app report includes:

| Field | Meaning |
| --- | --- |
| `app` | App key, such as `projects`, `finance`, or `zone`. |
| `label` | Human-readable app label. |
| `status` | `ready`, `needs_attention`, or `blocked`. |
| `readinessScore` | App-level readiness score. |
| `blockers[]` | Problems that prevent complete onboarding. |
| `warnings[]` | Problems that need attention but do not block the report. |
| `nextCommands[]` | Copy-paste setup or inspection commands. |
| `safeFirstCommands[]` | Manifest-declared read commands marked as safe audit defaults. |

Use `safeFirstCommands[]` for the first product reads after setup. They come from live manifests, not hard-coded guesses.

## `selectors`

`selectors` records what onboarding could infer:

| Field | Meaning |
| --- | --- |
| `workspace` | The selected workspace, or `null`. |
| `inferredTenants[]` | Tenant selectors found by read-only discovery. |
| `inferredStores[]` | Store selectors found by read-only discovery. |
| `missing[]` | Selectors that could not be inferred, with discovery hints when available. |

Selector inference is only for root-owned read-only workflows such as `workspace-snapshot`. Product mutations should still pass explicit selectors.

## `remediation[]`

Every remediation item is meant to be actionable:

```json
{
  "id": "finance.auth",
  "severity": "warning",
  "app": "finance",
  "reason": "Finance profile needs token authentication.",
  "nextCommand": "mere finance profiles login default --base-url https://<tenant>.mere.finance --json",
  "blocking": false
}
```

Treat `nextCommand` as the primary path forward. Onboarding writes commands, but it does not run browser login, token login, skill installation, write commands, or destructive commands for you.

Media local processing can also add non-blocking `media.mereRun` and `media.mereRunModels` remediations. Their next commands install or verify the public `mere.run` runtime, then pull app-requested models with `mere setup mere-run models --app media --json`.

## `artifacts` And `files`

`artifacts` points to the most important generated files:

| Field | Meaning |
| --- | --- |
| `bootstrap` | Path to `bootstrap.json`. |
| `onboardingReport` | Path to `onboarding-report.json`. |
| `onboardingMarkdown` | Path to `ONBOARDING.md`. |

`files` includes every generated file in the context pack.

## Human Reading Order

1. `ONBOARDING.md`
2. `onboarding-report.json`
3. `workspace-snapshot.json`
4. `apps-manifest.json`
5. `command-reference.md`

## Agent Reading Order

1. `AGENT.md`
2. `apps-manifest.json`
3. `auth-status.json`
4. `context.json`
5. `workspace-snapshot.json`
6. `mcp.json`
