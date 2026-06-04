# Hosted Product Docs

`mere docs` reads authenticated Mere platform and app documentation from the hosted docs API at `https://mere-docs.mere.world`. It is for customers, operators, and agents that do not have local Mere repositories.

The docs site remains protected by Mere World broker auth. The CLI does not read local repo paths and does not make docs public.

## First Login

```sh
mere docs login
mere docs status --json
```

`mere docs login` opens the Mere World broker flow and stores a docs-scoped app session under root CLI state. The session is separate from product app sessions.

Use `mere docs login --no-browser` when the CLI is running somewhere that cannot open a browser; it will print the authorization URL.

For automation, provide a docs-scoped session token without writing a session file:

```sh
MERE_DOCS_TOKEN=... mere docs search "site cms" --app business --json
```

Use `MERE_DOCS_BASE_URL` or `--base-url URL` only when intentionally targeting a preview docs worker.

## Find Docs

Search across the full hosted corpus:

```sh
mere docs search "workspace site lifecycle" --json
mere docs search "site cms assist" --app business --limit 5 --json
mere docs search "publish bundle rollback" --app dynasite --json
```

Use `--app APP` when you know the product boundary. Use `--source platform` for central platform docs and `--source app` for app-owned docs.

## List And Read

List matching docs:

```sh
mere docs index --json
mere docs index --app business --json
mere docs index --app dynasite --json
```

`mere docs list` is an alias for `mere docs index`.

Read by stable doc id:

```sh
mere docs read business/site-cms --json
mere docs read dynasite/cli/commands --json
mere docs read product/local-data-and-ai --source platform
```

Use `index` when you need stable ids, then `read` the exact page. Use `search` when you only know a phrase or workflow.

## Agent Workflow

Agents should prefer this order before attempting a product operation:

1. `mere apps manifest --app APP --json`
2. `mere docs search "workflow or command phrase" --app APP --json`
3. `mere docs read DOC_ID --json`
4. The product command, with `--json` and explicit selectors

For structured mutations, confirm the manifest says `supportsData: true` before using `--data` or `--data-file`.

## Auth Errors

If a read or search says no docs session exists:

```sh
mere docs login
```

If automation is running headlessly, set `MERE_DOCS_TOKEN` to a docs-scoped token. Do not make the docs site public to solve automation access; use authenticated CLI access instead.
