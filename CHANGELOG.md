# Changelog

All notable changes to Mere CLI are recorded here.

This project follows semantic versioning before `1.0.0` with the usual pre-1.0 caveat: minor versions may still refine public CLI behavior while the command plane settles.

## Unreleased

- Added public repository polish: package metadata, README badges, issue templates, pull request template, Dependabot config, support guide, code of conduct, and release checklist.
- Added CI coverage for package-content checks and docs builds.
- Added a manual npm publish workflow for provenance-backed public releases.

## 0.1.13

- Hardened bundled adapter safety checks before public release.
- Added shared command-risk classification for MCP and adapter CI checks.
- Added package-content checks that reject source maps, private paths, admin markers, and secret-looking material from the npm tarball.
- Documented the public adapter/API-shape security model in `SECURITY.md`, `adapters/README.md`, and safety docs.
