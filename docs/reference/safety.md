# Safety Model

Mere CLI is read-first. The root command plane helps humans and agents discover live command contracts before product work begins.

## Defaults

Invite-code onboarding has one explicit setup action:

```sh
mere business onboard start INVITE_CODE --json
```

That command may open the browser and create/provision a workspace from the invite. After a workspace exists, use read-only workflows first:

```sh
mere onboard --workspace WORKSPACE_ID --json
mere ops audit --workspace WORKSPACE_ID --json
mere ops workspace-snapshot --workspace WORKSPACE_ID --json
mere mcp serve
```

Operators and agents entering an already-provisioned workspace can start at `mere onboard --workspace ...`.

## Guardrails

- The root CLI never adds `--yes`.
- The root CLI never adds `--confirm`.
- Destructive commands keep app-local semantics.
- Permanent deletes, refunds, disconnects, releases, and expensive external actions require product-owned guardrails.
- MCP registers read-only tools by default.
- Write-capable MCP requires `mere mcp serve --allow-writes` or `MERE_MCP_ALLOW_WRITES=1`.
- Bundled adapter command names, route shapes, env var names, and default URLs are intentionally public.
- Security must come from server-side authentication, authorization, tenant/workspace scoping, and internal-token checks.
- Adapter manifests must mark command risk honestly: `read`, `write`, `destructive`, or `external`.

## Audit Trail

Root commands, delegated commands, and MCP invocations append redacted metadata to:

```txt
~/.local/state/mere/audit.ndjson
```

Product secrets remain in app-local session/profile stores.

## Before A Mutation

1. Run `mere apps manifest --app APP --json`.
2. Confirm the command path from the manifest.
3. Confirm `risk`, `supportsJson`, `supportsData`, `requiresYes`, and `requiresConfirm`.
4. Prefer `--data-file FILE` for structured payloads.
5. Use destructive guardrails only when the user explicitly approved the action and target.

## Publication Invariant

The CLI is a headless client. Anything in a bundled adapter may be read by an attacker, including internal endpoint paths. A route is safe to expose through adapter source only when missing credentials, wrong credentials, and valid credentials without the correct tenant/workspace/store access are rejected by the service.
