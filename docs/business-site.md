# Business Site Iteration

Business website requests move through a small state machine. The Business app CLI owns the behavior; the root `mere` CLI delegates to it and preserves the app's status, exit code, and JSON output.

Use this page when an operator or agent is revising a generated site preview, especially after the request is already preview-ready.

## Discover The Surface

Start from the live command manifest:

```sh
mere apps manifest --app business --json
```

The relevant commands are:

```sh
mere business site current --workspace WORKSPACE_ID --json
mere business site create --workspace WORKSPACE_ID --json
mere business site save-draft --workspace WORKSPACE_ID --json
mere business site approve --workspace WORKSPACE_ID --json
mere business site regenerate --workspace WORKSPACE_ID --json
mere business site request-changes --workspace WORKSPACE_ID --json
```

## Normal Revision Loop

Check the current request before mutating it:

```sh
mere business site current --workspace WORKSPACE_ID --json
```

If the request is already preview-ready and needs changes, move it back to draft review first:

```sh
mere business site request-changes --workspace WORKSPACE_ID --json
```

Then save the revised draft:

```sh
mere business site save-draft \
  --workspace WORKSPACE_ID \
  --raw-intake-text "Describe the requested changes here." \
  --json
```

Approve the revised brief so the site generation flow can pick it up:

```sh
mere business site approve --workspace WORKSPACE_ID --json
```

Re-check status:

```sh
mere business site current --workspace WORKSPACE_ID --json
```

## State Rules

- Use `site create` for a new website request, not for revising an active preview-ready request.
- Use `site request-changes` when a preview-ready request needs another draft pass.
- Use `site save-draft` only after the request is editable again.
- Use `site approve` when the draft is ready for the generation flow.
- Use `site regenerate` for an editable request when the brief should be regenerated from the current intake.

If a command returns `cannot_edit_in_current_status`, read its `details.nextCommands` value or the human "Next commands" output. That error means the request is locked by its current state, not that the command is missing from the CLI.

## Agent Handoff Notes

When a user says a preview looks wrong, capture the concrete requested changes, run `site current`, and choose the state transition from that output. Do not infer that `site create` is the recovery path just because it sounds like "make the site again."

For long change briefs, write the text to a file and pass it through the app command form exposed by the manifest when available; avoid fragile shell quoting for multiline customer copy.
