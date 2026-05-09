# Codebase Map

Mere CLI is the public `mere` command plane. It owns discovery, onboarding, safe ops reads, redacted audit logs, context packs, bundled adapter resolution, and MCP exposure; product behavior stays inside app CLI adapters.

Entry point: `src/run.ts` calls `runCli` in `src/root.ts`.

Core modules:

- `src/root.ts`: root command dispatcher and user-facing workflows.
- `src/registry.ts`: app registry and CLI source resolution.
- `src/manifest.ts`: schema-validated app command manifests.
- `src/safety.ts`: read/write/destructive command classification.
- `src/mcp.ts`: MCP tool generation from manifests.
- `src/context.ts`: persisted config and state.
- `src/process.ts`: the only source-owned child-process wrapper.
- `src/skills.ts`: skill registry fetch, install, and publish flows.
- `src/tui.ts`: first-use terminal UI.
- `src/mere-run.ts`: local `mere.run` runtime/model setup.

Generated/public artifacts:

- `dist/` is build output.
- `adapters/*/run.js` are bundled adapter artifacts. Do not hand-edit them; regenerate with `pnpm build:adapters` when private app repos are available.

Guardrails:

- Run `pnpm verify` before release-facing changes.
- Do not add direct `node:child_process` imports outside `src/process.ts`.
- Do not cast `JSON.parse`; validate external data at a boundary.
- Do not invent `--yes` or `--confirm`; app manifests declare destructive guardrails.
