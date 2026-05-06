# MCP Server

`mere mcp serve` exposes the manifest-backed command surface over stdio MCP.

Default mode registers only read-only and diagnostic tools. This is the recommended agent mode:

```sh
mere mcp serve
```

Write mode is explicit:

```sh
mere mcp serve --allow-writes
MERE_MCP_ALLOW_WRITES=1 mere mcp serve
```

Do not use write mode as a default. It exposes write/destructive/external tools from app manifests, but app guardrails still apply.

Tool names follow:

```text
mere_<app>_<command_path>
```

Examples:

- `mere_projects_project_list`
- `mere_email_threads_search`
- `mere_video_rooms_list`
- `mere_zone_stripe_status`

Tool inputs support:

- `args`
- `workspace`
- `baseUrl`
- `profile`
- `json`
- `data`
- `dataFile`
- `yes`
- `confirm`

Destructive and external tools still require `yes: true`. If a manifest says `requiresConfirm`, pass the exact target in `confirm`.

## Agent Workflow

1. Start with read-only MCP.
2. Use tools/list to discover generated tools.
3. Prefer read/audit/list/show tools before mutation.
4. For writes, restart the server with `--allow-writes` only after the task explicitly requires writes.
5. Use `data` for structured JSON payloads; use `args` for positionals that follow the command path.
6. Preserve product selectors such as `workspace`, `profile`, and app-specific positionals.

The MCP server uses the same resolved app adapters as the terminal entrypoint: env override, bundled adapter, local repo dist, then `PATH`. Product auth tokens remain in app-local stores, and root MCP invocations are logged to `~/.local/state/mere/audit.ndjson`.

## Smoke

```sh
pnpm smoke:mcp
```

This starts `mere mcp serve` over stdio with the MCP SDK client and verifies `tools/list` returns at least one tool.
