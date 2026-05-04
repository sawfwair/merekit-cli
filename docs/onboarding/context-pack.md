# Agent Context Pack

The context pack is a secret-free operating bundle for an agent or a human doing careful setup work.

It is created by `mere onboard` and by the lower-level `mere agent bootstrap` command. Onboarding adds `ONBOARDING.md` and `onboarding-report.json` on top of the bootstrap pack.

## Create The Pack

Normal users start by redeeming an invite, which creates or provisions the workspace:

```sh
mere business onboard start INVITE_CODE --json
```

After a workspace exists, create the readiness pack:

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```

Only create the lower-level pack when you do not need onboarding readiness:

```sh
mere agent bootstrap --workspace WORKSPACE_ID --target codex --json
```

Default output:

```txt
~/.config/mere/agents/default/
```

Custom output:

```sh
mere onboard --workspace WORKSPACE_ID --output .mere/onboarding --json
```

## File Map

| File | Purpose |
| --- | --- |
| `AGENT.md` | Generated operating guide with workspace, files, MCP command, and safety reminders. |
| `bootstrap.json` | Machine-readable bootstrap metadata, selected target, workspace, checks, and file paths. |
| `apps-list.json` | Resolved app adapters and source information. |
| `doctor.json` | Root-owned diagnostics for resolved apps. |
| `auth-status.json` | Browser-auth and token/profile auth summaries. |
| `finance-profiles.json` | Finance profile state. |
| `context.json` | Root config and state paths plus default workspace. |
| `apps-manifest.json` | Exact app command surface, risk, flags, JSON/data support, and guardrails. |
| `workspace-snapshot.json` | Read-only workspace snapshot when a workspace is selected. |
| `mcp.json` | MCP client config for the `mere` server. |
| `command-reference.md` | Manifest-derived command table. |
| `onboarding-report.json` | Onboarding readiness report. |
| `ONBOARDING.md` | Readable onboarding summary and next steps. |

## Secret Boundary

The pack intentionally stores summaries, manifests, and safe reads. Product tokens stay in app-local session/profile stores.

Root state lives at:

- `~/.config/mere/config.json`
- `~/.local/state/mere/state.json`
- `~/.local/state/mere/audit.ndjson`

Finance token profiles live in the Finance profile store, not in the context pack.

## MCP Config

`mcp.json` defaults to read-only:

```json
{
  "target": "codex",
  "readOnly": true,
  "mcpServers": {
    "mere": {
      "command": "mere",
      "args": ["mcp", "serve"]
    }
  }
}
```

If `mere agent bootstrap --allow-writes` is used, the generated MCP command includes `--allow-writes`. Prefer read-only unless the task explicitly needs writes.

## How Agents Should Use It

1. Read `AGENT.md`.
2. Inspect `apps-manifest.json` before command execution.
3. Check `auth-status.json` before assuming auth.
4. Read `workspace-snapshot.json` for cross-stack state.
5. Use `mcp.json` to start read-only tools.
6. Use exact manifest guardrails for writes or destructive actions.

## Refresh The Pack

Rerun onboarding after auth changes, adapter updates, workspace changes, or product manifest updates:

```sh
mere onboard --workspace WORKSPACE_ID --target codex --json
```
