---
layout: home
hero:
  name: Mere CLI
  text: Manage Mere from your terminal
  tagline: For workspace owners, operators, and developers. Use the Mere command-line interface (CLI) to check app state and prepare context for AI agents.
  actions:
    - theme: brand
      text: Get started
      link: '#get-started'
    - theme: alt
      text: Command reference
      link: /commands
    - theme: alt
      text: Agent setup
      link: /agent
features:
  - title: Set up your workspace
    details: Use your invite code to create and set up a workspace. If you don't have an invite, join the waitlist.
  - title: Inspect before you act
    details: Review each app's commands, options, and required confirmations. Before you make changes, check sign-in status and workspace data.
  - title: Prepare context for your agent
    details: Generate files with command details, setup reports, and workspace snapshots. Use the reports to plan the agent's next steps.
  - title: Read product docs
    details: Search and read Mere product documentation with <code>mere docs</code>. To use protected docs, sign in to the documentation service.
---

## Get started

You need Node.js 24 or 25 and npm. You don't need to install Mere CLI globally.

To start setup, run this command in an interactive terminal:

```sh
npx --yes @merekit/cli@latest onboard --interactive
```

When prompted, enter the value that matches your task:

- **Invite code:** Redeem your invite to create and set up a workspace. If prompted, sign in through your browser.
- **Email address:** Join the waitlist through your browser and confirm your email address. Joining the waitlist doesn't create a workspace.
- **Workspace ID:** Run setup checks for a workspace that you already have permission to use. This option is for operators and agents.

For installation options, see [Install the CLI](/onboarding/install). For setup without interactive prompts, see [First run](/onboarding/first-run).

## Review your setup

After workspace checks finish, the CLI writes reports to `~/.config/mere/agents/default/` by default.

Open the `ONBOARDING.md` file for setup status and recommended commands. For automation, use the `onboarding-report.json` file. Before running app commands, resolve any remaining setup requirements.

## Before you make changes

Installing the CLI doesn't grant workspace access. Each Mere app enforces its own authentication, workspace access, and confirmation requirements.

Before changing data, review the app's command options and [confirmation requirements](/reference/safety).

To connect an AI agent, use the [Model Context Protocol (MCP) server](/mcp). It provides read-only tools by default.

## Next steps

- [Read the onboarding report](/onboarding/report)
- [Prepare an agent context pack](/onboarding/context-pack)
- [Read product docs from your terminal](/product-docs)
- [Manage Business workspaces and sites](/business-site)
