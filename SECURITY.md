# Security Policy

Please report suspected security issues privately instead of opening a public issue.

Use GitHub private vulnerability reporting for this repository once it is public. If that is unavailable, contact the project maintainers through a private Sawfwair channel rather than opening a public issue.

Include the affected command or package version, a concise reproduction if possible, and whether credentials, workspace data, tokens, or hosted services may be involved.

The CLI is a client for Mere services. Possession of the CLI source or package does not grant access to Mere hosted services, accounts, workspaces, credentials, customer data, or platform operator permissions.

Bundled adapters intentionally expose command names, API route shape, environment variable names, and default service URLs. Treat those as public interface details, not secrets. All access decisions must be enforced by the Mere services through server-side session, bearer-token, workspace, tenant, role, and internal-service authorization checks.

Published adapter artifacts must be source-first. `pnpm build:adapters:release` accepts only clean live canonical default-branch commits with exact merged-pull-request, non-author approval, and green-check evidence. The generated schema-v2 manifest binds the source commit/tree, reproducible build recipe and toolchain, Contract fixtures when present, and every bundled file hash/size. The publish workflow independently re-hashes that inventory with `pnpm check:adapter-provenance`; legacy or development-mode manifests fail closed.

If a CLI command references an internal-token-only endpoint, the endpoint shape may still be public in this repository. That is acceptable only when the corresponding service rejects missing, invalid, or unauthorized tokens server-side.

## npm Supply Chain

Direct external dependencies are exact-pinned. Runtime transitive dependencies are published with `npm-shrinkwrap.json`, while development installs remain locked by `pnpm-lock.yaml`.

Dependency install-time lifecycle scripts require explicit review in `security/install-lifecycle-scripts.json`, and pnpm is configured to run only the reviewed build-script packages. `pnpm check:supply-chain` enforces the pinning, shrinkwrap, and lifecycle allowlist.

The publish workflow uses npm trusted publishing with GitHub OIDC and provenance instead of a long-lived npm publish token. Keep npm package publishing protected by maintainer 2FA and the `npm` GitHub environment.
