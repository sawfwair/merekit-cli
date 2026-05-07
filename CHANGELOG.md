# Changelog

All notable changes to Mere CLI are recorded here.

This project follows semantic versioning before `1.0.0` with the usual pre-1.0 caveat: minor versions may still refine public CLI behavior while the command plane settles.

## Unreleased

- Nothing yet.

## 0.1.17 - 2026-05-07

- Added the bundled Media adapter and documented the full 11-adapter command surface.
- Added `mere setup mere-run` to orchestrate `mere.run` runtime setup from an existing binary, `~/mere/run-public`, or a verified DMG.
- Added app-requested `mere.run` model pulls, with Media requesting local transcription and embedding models.
- Added adapter coverage checks so registry, bundled metadata, and docs stay in sync.

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
