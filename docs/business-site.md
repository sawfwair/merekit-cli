# Business Workspace And Site Lifecycle

Business is the normal user and operator surface for creating, configuring, managing, and handing off customer workspaces. Dynasite is available as the direct provider and diagnostic surface when a site needs deeper inspection or recovery.

Use this page when an operator, customer, or agent needs to drive a workspace and website through the CLI without platform-admin handholding.

## Discover The Surface

Start from the live manifests. They are the command source of truth for paths, flags, JSON support, risk, and confirmation requirements.

```sh
mere apps manifest --app business --json
mere apps manifest --app dynasite --json
```

Use Business for workspace-aware work:

```sh
mere business workspace list --json
mere business workspace current --json
mere business workspace use --workspace WORKSPACE_ID --json
mere business workspace status --workspace WORKSPACE_ID --json
mere business workspace setup --workspace WORKSPACE_ID --json
```

Create a normal customer workspace when the user is entitled to do so:

```sh
mere business workspace create \
  --name "Acme Studio" \
  --slug acme-studio \
  --business-mode standard \
  --yes \
  --json
```

`workspace.create` is an external operation and requires `--yes`. `workspace.status` and `workspace.setup` are read commands; use them before changing site state.

## Site Routes

Business supports three website routes from the workspace-aware CLI.

### Existing Website Import

Use this when the customer already has a website and wants Mere to research it, import usable facts and media, and seed the CMS draft.

```sh
mere business site import-existing \
  --workspace WORKSPACE_ID \
  --url https://example.com \
  --json
```

This is not a guaranteed pixel-perfect clone. Treat partial crawl, media, or attachment failures as first-class blockers in the returned JSON. If the user needs an exact static site, use the static bundle route.

### Net-New Site Request

Use this for a new Business-generated site. Check the current request before mutating it.

```sh
mere business site current --workspace WORKSPACE_ID --json
mere business site create --workspace WORKSPACE_ID --business-name "Acme Studio" --json
mere business site save-draft --workspace WORKSPACE_ID --raw-intake-text "..." --json
mere business site approve --workspace WORKSPACE_ID --yes --json
```

When a preview-ready request needs changes, move it back to draft review first:

```sh
mere business site request-changes \
  --workspace WORKSPACE_ID \
  --latest-update "Make the service area clearer and replace the hero copy." \
  --json
```

Then save and approve the revised draft:

```sh
mere business site save-draft --workspace WORKSPACE_ID --raw-intake-text "..." --json
mere business site approve --workspace WORKSPACE_ID --yes --json
```

Use `site regenerate --yes` only when the brief should be regenerated from the current intake. If a command returns `cannot_edit_in_current_status`, read `details.nextCommands`; the request is locked by state, not missing from the CLI.

### Static Bundle Upload

Use this when Claude, Codex, or another tool generated a static HTML/CSS/JS/assets site. The bundle must include `index.html`. V1 does not run arbitrary server or Worker code; Mere controls the runtime and serves static files through Dynasite.

Upload a directory:

```sh
mere business site bundle upload \
  --workspace WORKSPACE_ID \
  --site-id DYNASITE_SITE_ID \
  --source-dir ./site-dist \
  --title "Claude static build" \
  --json
```

Or upload a zip:

```sh
mere business site bundle upload \
  --workspace WORKSPACE_ID \
  --site-id DYNASITE_SITE_ID \
  --zip ./site-dist.zip \
  --json
```

Inspect, publish, and roll back:

```sh
mere business site bundle status --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --json
mere business site bundle publish --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --bundle-id BUNDLE_ID --environment live --yes --json
mere business site bundle rollback --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --environment live --yes --json
```

Bundle publish and rollback are external operations and require `--yes`.

## CMS, Media, Revisions, And Publish

After a site exists, use the workspace-aware Business commands first:

```sh
mere business site status --workspace WORKSPACE_ID --json
mere business site cms get --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --json
mere business site cms edit --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --edit-json '{"headline":"Updated headline"}' --json
mere business site cms assist --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --action rewrite-section --target-index 0 --json
mere business site media import --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --discover --json
mere business site media upload --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --file ./hero.jpg --alt "Hero image" --role hero --json
mere business site revisions list --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --json
mere business site revisions revert --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID REVISION_ID --json
mere business site publish --workspace WORKSPACE_ID --site-id DYNASITE_SITE_ID --environment live --yes --json
```

Publish is an external operation and requires `--yes`.

## Direct Dynasite Recovery

Use `mere dynasite ...` for provider-level diagnostics, inspection, recovery, or cross-checking a site created through Business.

```sh
mere dynasite sites list --json
mere dynasite sites get --site-id DYNASITE_SITE_ID --json
mere dynasite sites cms get --site-id DYNASITE_SITE_ID --json
mere dynasite sites media upload --site-id DYNASITE_SITE_ID --file ./hero.jpg --json
mere dynasite sites revisions list --site-id DYNASITE_SITE_ID --json
mere dynasite sites publish --site-id DYNASITE_SITE_ID --environment live --yes --json
mere dynasite sites bundle upload --site-id DYNASITE_SITE_ID --source-dir ./site-dist --json
mere dynasite sites bundle publish --site-id DYNASITE_SITE_ID --bundle-id BUNDLE_ID --environment live --yes --json
mere dynasite sites bundle rollback --site-id DYNASITE_SITE_ID --environment live --yes --json
```

Direct Dynasite publish and bundle publish/rollback are external operations and require `--yes`.

## Status Model

Across import, generated, and static-bundle paths, treat status as a workflow signal:

- `intake`: the request exists but needs customer or operator input.
- `researching`: source-site or business research is running.
- `draft ready`: a draft can be reviewed or edited.
- `approved`: the brief is approved for generation.
- `preview generating`: a preview is being prepared.
- `preview ready`: the preview can be inspected, revised, or published.
- `changes requested`: the preview was sent back for edits.
- `publish blocked`: required data, media, entitlement, domain, or access is missing.
- `live`: the site is published.
- `failed`: inspect `error`, `blockers`, and `nextCommands`.

## Agent Handoff Notes

When a user says a preview looks wrong, capture the concrete requested changes, run `site current` or `site status`, and choose the transition from that output. Do not infer that `site create` is the recovery path just because it sounds like "make the site again."

For long change briefs, write the text to a file and use the app command form exposed by the manifest when available. For CMS edits, pass a JSON object through `--edit-json`. Prefer `--json` and `nextCommands` over shell parsing.
