# Architectural Decisions

## Bundled Adapters Are Public Artifacts

The npm package ships `adapters/*/run.js` so `mere` works without private app repos. These files may reveal command names, public route shapes, environment variable names, and default service URLs, but must not contain credentials, source maps, customer data, tenant data, or private app source.

## Product CLIs Own Product Semantics

The root CLI routes, discovers, audits, and summarizes. It does not reimplement product workflows. App manifests are the contract for command paths, supported flags, JSON/data support, auth, risk, and destructive confirmations.

## MCP Is Read-Only By Default

`mere mcp serve` exposes read commands only. Write, destructive, and external commands require `--allow-writes` or `MERE_MCP_ALLOW_WRITES=1`, and destructive tools still require the manifest-declared `yes` and `confirm` inputs.

## JSON Boundaries Must Be Parsed, Not Cast

External or persisted JSON must enter through a schema or a small typed helper. This keeps agent edits from silently trusting malformed manifests, remote skill registries, config files, state files, or package metadata.

## CLI Source Resolution Is Ordered

Delegated CLIs resolve in this order: explicit environment override, bundled adapter, local repo path under `MERE_ROOT`, then binary on `PATH`. `MERE_CLI_SOURCE=auto|bundled|local|path` exists for debugging and test simulation.

## Finance Auth Is Profile-Based

Finance uses token/profile auth instead of browser sessions. Root-owned finance helpers may read and write local profile config, but token login remains delegated to the Finance CLI.

## Process Execution Has One Owned Path

Source code should call `runCapture` or `runInherit` from `src/process.ts` instead of importing `node:child_process` directly. This keeps timeouts, environment handling, and future audit hooks centralized.
