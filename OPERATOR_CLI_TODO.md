# Operator CLI TODO

## Goal

Make `mere-cli-public` a forkable operator command plane. An operator or agency should be able to fork the repo, add checked-in business logic adapters, and have those commands participate in the same root CLI systems as built-in Mere apps: delegation, manifests, audits, MCP, onboarding, snapshots, completion, and agent packs.

The first PR should prove the extension surface. It should not add scaffolding commands, branded binary behavior, package splitting, or inline plugin handlers.

## Operator Model

- The root CLI remains the safety/router layer. It discovers command surfaces, filters supported flags, delegates execution, audits activity, builds context packs, and exposes MCP tools.
- Operator business logic lives in executable adapters. Each adapter is a CLI that exposes the existing `commands --json` manifest contract.
- Operator adapters are first-class namespaces alongside built-in apps such as `projects`, `zone`, and `finance`.
- Operators are included everywhere by default once configured.
- Built-in Mere app behavior remains unchanged when no operator config exists.

## PR 1 Scope

- Add repo-local operator config discovery.
- Add dynamic operator registry entries.
- Generalize registry typing away from fixed built-in app keys where necessary.
- Include operator entries in apps, delegation, completion, auth status, setup, ops, onboarding, agent packs, and MCP.
- Preserve built-in-specific behavior for Finance auth and Today/Zone/Gives selector inference.
- Update package allowlists so forks can publish checked-in operator config and adapter files.
- Add tests and docs for the operator extension surface.

## Config Discovery

Default config path:

```txt
mere.operator.json
```

This file is resolved from the package root.

Environment override:

```sh
MERE_OPERATOR_CONFIG=/path/to/mere.operator.json
```

Behavior:

- Missing default config means no operator entries.
- Missing env-specified config should fail fast.
- Invalid JSON should fail fast.
- Schema errors should fail fast.
- Duplicate keys, aliases, or namespaces should fail fast.
- Operator aliases that collide with reserved root commands should fail fast.
- Missing adapter files should not fail registry loading. They should appear as missing in `apps list` and `apps doctor`, matching existing app behavior.

## Config Schema

Example:

```json
{
  "schemaVersion": 1,
  "operators": [
    {
      "key": "leads",
      "label": "Leads",
      "namespace": "leads",
      "aliases": ["leads", "crm"],
      "authKind": "browser",
      "adapterPath": "operator-adapters/leads/run.js",
      "envCliPath": "MERE_OPERATOR_LEADS_CLI",
      "localCliPath": "operator-adapters/leads/run.js",
      "repoDir": ".",
      "pathBins": ["mere-leads"],
      "packageScripts": {}
    }
  ]
}
```

Required fields:

- `key`
- `label`
- `authKind`

Defaults:

- `namespace = key`
- `aliases = [key]`
- `adapterPath = operator-adapters/<key>/run.js`
- `envCliPath = MERE_OPERATOR_<KEY>_CLI`
- `localCliPath = adapterPath`
- `repoDir = config directory`
- `pathBins = ["mere-<key>", key]`
- `packageScripts = {}`

Supported `authKind` values should match the existing registry contract:

- `browser`
- `token`
- `device`
- `none`
- `mixed`

## Implementation Checklist

### Registry And Types

- Update `src/types.ts` so dynamic registry keys are represented as strings where needed.
- Keep built-in app keys as constants for built-in-specific behavior.
- Add `kind: "builtin" | "operator"` to `RegistryEntry`.
- Add an operator config loader in `src/registry.ts`.
- Merge built-in and operator entries in `createRegistry(...)`.
- Validate collisions across built-ins, operators, aliases, namespaces, and reserved root commands.
- Resolve relative operator paths from the operator config directory.

### CLI Behavior

- `mere apps list --json` includes operator entries with `kind: "operator"`.
- `mere apps manifest --json` includes operator manifests.
- `mere apps doctor --json` checks operator adapters.
- `mere <operator> ...` delegates through the same manifest-backed path as built-ins.
- `mere completion bash|zsh|fish` includes operator aliases and first command segments.
- `mere auth status --all --json` includes operator entries.
- `mere setup build|check|smoke --all --json` includes operators and skips missing scripts.
- `mere ops audit --json` includes operator audit defaults.
- `mere ops workspace-snapshot --workspace ID --json` includes operator audit defaults.
- `mere onboard --workspace ID --json` includes operator readiness.
- `mere agent bootstrap --workspace ID --json` writes operator commands into generated manifest and command reference files.
- `mere mcp serve` exposes operator read tools.
- `mere mcp serve --allow-writes` exposes operator write/destructive tools with the existing guardrails.
- `mere tui` should include operator namespaces in the app picker.

### Built-In Special Cases

- Keep Finance profile helpers built-in only.
- Keep Today tenant inference built-in only.
- Keep Zone store inference built-in only.
- Keep Gives tenant mapping built-in only.
- Do not invent selector inference for operator apps in PR 1.
- Operator snapshot commands should receive generic supported flags such as `--workspace` and `--json` through the manifest filter.

### Packaging

- Add `mere.operator.json` to the package `files` allowlist.
- Add `operator-adapters` to the package `files` allowlist.
- Keep public `@merekit/cli` behavior unchanged when no operator config is present.
- Ensure package safety checks still scan operator adapter contents.
- Do not ship a default public operator config unless the first PR intentionally adds a tiny example outside the package allowlist.

### Docs

- Add `docs/operator-cli.md`.
- Update `README.md` to mention forkable operator adapters.
- Update `docs/commands.md` to note that manifests may include built-in and operator namespaces.
- Update `docs/agent.md` to explain that operator commands appear in the same agent/MCP flow.

## Test Checklist

Add tests with a fake `mere.operator.json` and fake executable adapter.

Required root CLI tests:

- `apps list --json` includes built-ins plus an operator entry.
- Operator entry includes `kind: "operator"`.
- `mere leads queue list --workspace ws_1 --json` delegates to the operator adapter.
- Delegation filters unsupported flags using the operator manifest.
- `apps manifest --json` includes the operator manifest.
- `ops workspace-snapshot --workspace ws_1 --json` runs operator `auditDefault` read commands.
- `agent bootstrap --workspace ws_1 --json` writes operator commands into `apps-manifest.json`.
- `agent bootstrap --workspace ws_1 --json` writes operator commands into `command-reference.md`.
- `completion bash` includes the operator alias and first command segment.
- Invalid config fails clearly.
- Duplicate aliases fail clearly.
- Reserved-command aliases fail clearly.

Required MCP tests:

- Operator read commands appear as tools by default.
- Operator write/destructive tools are hidden by default.
- Operator write/destructive tools appear with writes allowed.
- Operator tool names use `mere_<namespace>_<command_path>`.

Verification commands:

```sh
pnpm check
pnpm test
pnpm smoke:mcp
pnpm pack:dry
```

## Acceptance Criteria

- A fork can add `mere.operator.json` and `operator-adapters/<key>/run.js`.
- Running `mere apps list --json` shows the operator namespace.
- Running `mere <operator> ...` delegates to the configured adapter.
- Running `mere apps manifest --json` shows built-in and operator command manifests.
- Running `mere ops workspace-snapshot --workspace ws_123 --json` includes operator read defaults.
- Running `mere agent bootstrap --workspace ws_123 --json` includes operator commands in generated artifacts.
- Running `mere mcp serve` exposes operator read tools.
- Existing behavior is unchanged when no operator config exists.

## Later PRs

- Add `mere operator init`.
- Add a copyable `templates/operator-cli` example.
- Add branded binary/help text support.
- Consider extracting a reusable `@merekit/cli-core` package after fork pressure proves the need.
- Add richer operator docs for cross-app workflows, deployment, and upgrade strategy.
