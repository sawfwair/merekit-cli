---
layout: home
hero:
  name: Mere CLI
  text: One command plane for Mere workspaces.
  tagline: Install once, onboard safely, inspect live app manifests, and hand agents a secret-free operating pack.
  actions:
    - theme: brand
      text: Start Onboarding
      link: /onboarding/
    - theme: alt
      text: Command Reference
      link: /commands
features:
  - title: Onboarding first
    details: "'mere tui' guides normal users from an invite code; 'mere onboard' runs discovery, readiness checks, auth status, manifest collection, and safe workspace reads for operators and agents."
  - title: Manifest-backed operations
    details: Product behavior stays in app CLIs. The root discovers exact command paths, risks, flags, JSON support, and destructive guardrails.
  - title: Agent-ready by default
    details: Context packs include docs, manifests, auth summaries, snapshots, MCP config, and next commands without copying product secrets.
---

## What Mere CLI Is

`mere` is the public command plane for Mere. It gives humans and agents one entrypoint while product behavior remains owned by the app CLIs bundled inside `@merekit/cli`.

The root CLI is responsible for discovery, onboarding, context, diagnostics, read-only ops workflows, audit metadata, and MCP access. App CLIs remain authoritative for product authentication, workspace selectors, mutation semantics, and destructive guardrails.

<div class="mere-path">
  <div class="mere-step">
    <strong>Install</strong>
    <span>Add <code>@merekit/cli</code> and confirm the <code>mere</code> binary is available.</span>
  </div>
  <div class="mere-step">
    <strong>Onboard</strong>
    <span>Run <code>mere tui</code> for invite-code onboarding, or <code>mere onboard</code> when an operator or agent already has a workspace.</span>
  </div>
  <div class="mere-step">
    <strong>Operate</strong>
    <span>Use manifests, snapshots, and MCP tools to inspect first and delegate carefully.</span>
  </div>
</div>

## Start Here

Human invite-code first run:

```sh
npm install -g @merekit/cli
mere tui
```

Headless invite bootstrap and operator workspace handoff:

```sh
mere business onboard start INVITE_CODE --json
mere onboard --workspace WORKSPACE_ID --target codex --json
```

Then open the generated `ONBOARDING.md` for a readable summary and `onboarding-report.json` for automation.

## Next Steps

- [Install the CLI](/onboarding/install)
- [Run onboarding](/onboarding/first-run)
- [Read the onboarding report](/onboarding/report)
- [Understand the agent context pack](/onboarding/context-pack)
- [Follow the agent workflow](/agent)
- [Use the command reference](/commands)
- [Run the release checklist](/release-checklist)
