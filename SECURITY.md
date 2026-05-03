# Security Policy

Please report suspected security issues privately instead of opening a public issue.

Use GitHub private vulnerability reporting for this repository once it is public. If that is unavailable, contact the project maintainers through a private Sawfwair channel rather than opening a public issue.

Include the affected command or package version, a concise reproduction if possible, and whether credentials, workspace data, tokens, or hosted services may be involved.

The CLI is a client for Mere services. Possession of the CLI source or package does not grant access to Mere hosted services, accounts, workspaces, credentials, customer data, or platform operator permissions.

Bundled adapters intentionally expose command names, API route shape, environment variable names, and default service URLs. Treat those as public interface details, not secrets. All access decisions must be enforced by the Mere services through server-side session, bearer-token, workspace, tenant, role, and internal-service authorization checks.

If a CLI command references an internal-token-only endpoint, the endpoint shape may still be public in this repository. That is acceptable only when the corresponding service rejects missing, invalid, or unauthorized tokens server-side.
