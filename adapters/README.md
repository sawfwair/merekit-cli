# Generated Adapters

This directory contains generated public client artifacts for bundled Mere app CLIs.
They are committed so the `@merekit/cli` npm package works out of the box after a global install.

The adapters intentionally expose command names, public API route shapes, environment variable names, and default service URLs. They do not contain credentials or grant access to Mere hosted services.

Access is enforced by the Mere services through browser sessions, bearer tokens, workspace membership, roles, destructive-operation confirmations, and server-side authorization checks.

Maintainers regenerate these files from the Mere app repositories with `pnpm build:adapters`. That command expects the private app repositories to be available as sibling directories and is not required for normal public development of the root CLI.
