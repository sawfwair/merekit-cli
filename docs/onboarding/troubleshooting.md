# Troubleshooting Onboarding

Start with the generated `ONBOARDING.md`. It already orders the most important next command per app. Use this page when you need to interpret a blocker or warning.

## Missing Workspace

Symptom:

- App status is `blocked`.
- Remediation id ends in `.workspace`.
- The next command is `mere onboard --workspace WORKSPACE_ID --json`.

Fix for a normal user with an invite code:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --json
```

Fix for an operator or agent that already has a workspace ID:

```sh
mere onboard --workspace WORKSPACE_ID --json
```

You can also store the root default explicitly:

```sh
mere context set-workspace --workspace WORKSPACE_ID
mere ops workspace-snapshot --json
```

## Missing Adapter

Symptom:

- App status is `blocked`.
- Remediation id ends in `.adapter`.
- The next command is `mere setup build --app APP`.

Fix in a local Mere development environment:

```sh
mere setup build --app APP
mere onboard --app APP --workspace WORKSPACE_ID --json
```

For installed users, confirm the package can see bundled adapters:

```sh
mere apps list --json
MERE_CLI_SOURCE=bundled mere apps list --json
```

## Manifest Unavailable

Symptom:

- App status is `blocked`.
- Remediation id ends in `.manifest`.
- The app cannot return `commands --json`.

Fix:

```sh
mere apps doctor --app APP --json
mere apps manifest --app APP --json
```

If you are developing locally, rebuild the app adapter and rerun onboarding.

## Browser Auth Missing

Symptom:

- App status is `needs_attention`.
- Warning says browser auth is not confirmed.

Fix with the app-specific login command from `remediation[].nextCommand`. For example:

```sh
mere auth login --app projects --workspace WORKSPACE_ID
mere onboard --app projects --workspace WORKSPACE_ID --json
```

Browser-auth apps keep app-local sessions. The root reports their status but does not copy browser tokens into the context pack.

## Finance Auth Missing

Symptom:

- App status is `needs_attention`.
- Warning says Finance token/profile auth is not confirmed.
- Remediation id is `finance.auth`.

Fix:

```sh
mere finance profiles login default --base-url https://<tenant>.mere.finance --json
mere onboard --app finance --workspace WORKSPACE_ID --json
```

If you know the profile and URL in advance:

```sh
mere onboard --app finance --workspace WORKSPACE_ID --finance-profile books --finance-base-url https://finance.example.com --json
```

## Selector Hints Are Missing

Symptom:

- `selectors.missing[]` contains tenant, store, or app-specific selector hints.
- `workspace-snapshot.json` has skipped coverage for some safe reads.

Fix:

```sh
mere apps manifest --app APP --json
mere <app> <safe-list-command> --workspace WORKSPACE_ID --json
```

Use the manifest to find the safe list or resolve command. Do not guess selectors for writes.

## Snapshot Command Failed

Symptom:

- `workspace-snapshot.json` includes a command with `ok: false`.
- The app report warns that safe read commands failed.

Fix:

```sh
mere ops workspace-snapshot --workspace WORKSPACE_ID --app APP --json
mere apps manifest --app APP --json
```

Then rerun the failed delegated read directly with the same selector flags.

## MCP Shows No Write Tools

Default MCP mode is read-only:

```sh
mere mcp serve
```

Write and destructive tools are hidden unless the server starts in write-capable mode:

```sh
mere mcp serve --allow-writes
```

Even in write-capable mode, app guardrails still apply. If a manifest says a command requires `--yes` or exact `--confirm`, the MCP input must include the matching fields.

## The Report Looks Stale

Rerun onboarding after any of these changes:

- Invite code redemption or workspace bootstrap.
- New workspace.
- New app adapter.
- Browser auth login or logout.
- Finance profile login.
- Product deploy that changes command manifests.
- MCP write-mode decision.

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```
