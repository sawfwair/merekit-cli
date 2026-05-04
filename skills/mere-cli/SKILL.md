# mere-cli

Use this skill when operating the Mere portfolio through the root `mere` command plane.

`mere` is agent-native infrastructure: it discovers bundled or overridden app CLI adapters, loads their command manifests, delegates product behavior, records redacted audit metadata, and exposes read-only MCP tools by default. It does not bypass app guardrails.

## Workflow

1. Run `mere --help`, `mere help onboard`, and `mere help agent` to read the root operating model.
2. For a human first run, prefer `mere tui`. A normal user starts with an invite code.
3. If the user has an invite code and you are operating headlessly, run `mere business onboard start INVITE_CODE --json` first. This signs in or signs up through the browser if needed and bootstraps the workspace from the invite. It does not require a prior `auth login`.
4. After invite bootstrap returns a workspace, run `mere onboard --workspace WORKSPACE_ID --target codex --json`. If an operator supplied a workspace ID at the start, treat that as a support/agent path for an already-provisioned workspace. Onboarding writes `AGENT.md`, manifests, auth status, doctor output, workspace snapshot, MCP config, a command reference, `onboarding-report.json`, and `ONBOARDING.md` under `~/.config/mere/agents/default`.
5. Run `mere apps list --json` to see registered apps and CLI locations.
6. Run `mere ops doctor --json` before cross-stack work.
7. Run `mere auth status --all --json` to inspect app session state.
8. Use `mere auth status --app finance --json` and `mere finance profiles list --json` when Finance token/profile state matters.
9. Set or pass a workspace: `mere context set-workspace --workspace WORKSPACE_ID` or use explicit `--workspace`.
10. Use `mere ops workspace-snapshot --workspace WORKSPACE_ID --json` for grouped read-only cross-app inspection.
11. Use `mere apps manifest --app APP --json` to discover exact command paths, risk, flags, JSON/data support, and guardrails.
12. Use `mere <app> ...` for product-owned operations.
13. For agents, start MCP with `mere mcp serve`; add `--allow-writes` only when write tools are intentionally in scope.

## Discovery Rules

- Treat `mere apps manifest --json` as the command source of truth.
- Check `risk` before acting: `read`, `write`, `external`, or `destructive`.
- Check `supportsJson` before assuming parseable JSON.
- Check `supportsData` before using `--data` or `--data-file`.
- Check `requiresYes` and `requiresConfirm` before any destructive/external action.
- Delegated commands preserve app stdout, stderr, and exit codes.
- Root pass-through flags are forwarded only when the target manifest supports them.
- Installed packages should normally resolve app adapters with `source: "bundled"`.
- Source resolution is env override, bundled adapter, local `MERE_ROOT` dist, then `PATH`.
- Use `MERE_CLI_SOURCE=auto|bundled|local|path` only when debugging resolution.
- Video browser-host commands need `@playwright/test` installed in the same npm prefix; read-only Video commands do not.

## Workspace Snapshot

Use snapshot before making product changes:

```sh
mere ops workspace-snapshot --workspace WORKSPACE_ID --json
```

Root snapshot is read-only and includes selector help for audited reads:

- Today defaults to `auth whoami` and workspace booking context reads; booking/time mutations are not default snapshot commands.
- Zone infers `--store` for Stripe status.
- Gives accepts the workspace id as `--tenant` and canonicalizes internally.

## Guardrails

- The root CLI never injects `--yes` or `--confirm`.
- Permanent deletes, refunds, disconnects, and expensive external actions must carry the app-local guard flags.
- MCP is read-only unless started with `--allow-writes` or `MERE_MCP_ALLOW_WRITES=1`.
- Root audit logs are stored at `~/.local/state/mere/audit.ndjson`.
- Product auth tokens remain in product-local stores.
- Finance intentionally uses scoped token profiles rather than browser auth.

## Examples

```sh
mere help agent
mere tui
mere business onboard start INVITE_CODE --json
mere onboard --workspace ws_123 --target codex --json
mere agent bootstrap --workspace ws_123 --target codex --json
mere apps list --json
mere ops doctor --json
mere auth status --all --json
mere context set-workspace --workspace ws_123
mere ops workspace-snapshot --json
mere apps manifest --app projects --json
mere projects project list --workspace acme --json
mere auth status --app finance --json
mere finance profiles list --json
mere email threads search invoice --workspace acme --json
mere zone order refund ord_123 --yes --confirm ord_123
mere mcp serve
```
