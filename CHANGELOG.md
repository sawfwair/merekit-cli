# Changelog

All notable changes to Mere CLI are recorded here.

This project follows semantic versioning before `1.0.0` with the usual pre-1.0 caveat: minor versions may still refine public CLI behavior while the command plane settles.

## Unreleased

## 0.5.6 - 2026-07-07

- Published bundled Works and Zone adapters with `auth agent-login`, letting browserless agents exchange a workspace-scoped Business session for product CLI sessions without opening a browser.

## 0.5.5 - 2026-07-07

- Published the bundled Projects adapter with `mere projects auth agent-login` so browserless agents can exchange a workspace-scoped Business session for a Projects CLI session without opening a browser.

## 0.5.4 - 2026-07-07

- Published the bundled Business adapter fix so browserless agent onboarding persists the returned workspace-scoped Business CLI session locally while keeping session material out of JSON output.

## 0.5.3 - 2026-07-07

- Added the browserless `mere business onboard agent-start` invite bootstrap path to the bundled Business adapter and root agent guidance.
- Updated local app repo resolution to prefer usable `mere-*` checkouts over partial legacy helper folders.
- Completed the registered IM adapter packaging so the root registry, bundled adapters, docs, and package checks stay in sync.

## 0.5.0 - 2026-06-04

- Added `mere docs login|status|index|read|search|logout` for authenticated hosted Mere platform and app docs through `mere-docs.mere.world`, without reading local repo paths or making docs public.
- Added docs filtering by `--app` and `--source`, docs-scoped session storage, `MERE_DOCS_TOKEN` automation support, shell completion, help text, and root tests for the hosted docs flow.
- Refreshed bundled Business and Dynasite adapters so the public CLI exposes the Jormuwave site-CMS customer-help surface, including `site cms get`, `site cms edit` with structured data support, and `site cms assist`.
- Added the release-facing docs Worker package contents and dry-run checks needed for the hosted docs command surface.

## 0.4.1 - 2026-05-27

- Fixed adapter generation to prefer `mere-*` app repositories when both legacy and prefixed checkouts exist, so the bundled Network adapter includes its local-plane command surface.

## 0.4.0 - 2026-05-27

- Regenerated all bundled app adapters from the current Mere workspace, expanding the command surface for local-plane aware apps.
- Added the updated Email adapter with local-plane sync and traversal commands, including `sync pull`, `threads list`, `threads latest`, and local search/show flows.
- Updated root CLI delegation so manifest-declared app globals such as `--store`, `--local-db`, and adapter-specific local-plane flags are retried before the app command when adapters require leading options.
- Updated the generated command matrix and adapter safety checks for the refreshed local/cloud adapter surface.

## 0.3.0 - 2026-05-25

- Added the bundled Dynasite root adapter so `mere dynasite ...` is available for direct site diagnostics, CMS/media operations, publishing, and static bundle management.
- Regenerated the Business adapter with workspace lifecycle commands, existing-site import, CMS/media/revision operations, publishing, and static bundle upload/publish/rollback flows.
- Expanded the root app registry and docs so Business, Dynasite, Link, Zone, and adjacent adapters match the current source manifests.
- Hardened npm supply-chain controls by removing the Ink/React runtime renderer dependencies, exact-pinning direct dependencies, adding a published shrinkwrap, reviewing install-time lifecycle scripts, and adding scheduled audit/signature checks.

## 0.2.3 - 2026-05-15

- Hardened `mere setup mere-run` so it validates that a discovered binary is the real CLI payload before trusting it.
- Fixed app-requested `mere.run` model pulls to fail when `mere.run model pull` exits successfully but the model still reports as missing.
- Clarified `mere.run` setup docs for app-bundled CLI payloads and Media-requested local models.

## 0.2.0 - 2026-05-09

- Reworked the first-use TUI rendering around React Ink while preserving the existing invite, waitlist, and operator workspace flows.
- Added the bundled Media adapter and documented the full 14-adapter command surface.
- Added `mere setup mere-run` to orchestrate `mere.run` runtime setup from an existing binary, `~/mere/run-public`, or a verified DMG.
- Added app-requested `mere.run` model pulls, with Media requesting local transcription and embedding models.
- Added adapter coverage, package content, and generated-artifact checks so registry, bundled metadata, docs, and npm contents stay in sync.

## 0.1.16 - 2026-05-06

- Regenerated bundled app adapters from the current external app CLIs, including the expanded Projects proposal readiness, export, defaults, and SAM search command surface.
- Updated adapter safety/docs for the Works external workspace command contract and Today local D1 query risk classification.

## 0.1.15 - 2026-05-06

- Added the protected pre-invite waitlist path through `mere business waitlist join --email EMAIL` and `mere tui --waitlist-email EMAIL`.
- Updated first-use TUI, root help, shell completion, docs, README, and bundled `mere-cli` skill to present waitlist email, invite code, and operator workspace ID as distinct paths.
- Updated the bundled Business adapter to open the Turnstile and magic-link protected `merekit.com/waitlist` browser handoff instead of submitting emails directly.
- Updated package metadata so npm describes waitlist and invite onboarding.

## 0.1.14 - 2026-05-04

- Added the first-use TUI (`mere tui` and `mere onboard --interactive`) for invite-code onboarding and operator workspace checks.
- Added invite-code onboarding docs across README, VitePress docs, command reference, agent workflow, ops, safety, troubleshooting, and the bundled `mere-cli` skill.
- Added GitHub Pages deployment for the VitePress docs site.
- Added release workflow support for creating a GitHub Release after a successful npm publish.

## 0.1.13

- Added public repository polish: package metadata, README badges, issue templates, pull request template, Dependabot config, support guide, code of conduct, and release checklist.
- Added CI coverage for package-content checks and docs builds.
- Added a manual npm publish workflow for provenance-backed public releases.

- Hardened bundled adapter safety checks before public release.
- Added shared command-risk classification for MCP and adapter CI checks.
- Added package-content checks that reject source maps, private paths, admin markers, and secret-looking material from the npm tarball.
- Documented the public adapter/API-shape security model in `SECURITY.md`, `adapters/README.md`, and safety docs.
