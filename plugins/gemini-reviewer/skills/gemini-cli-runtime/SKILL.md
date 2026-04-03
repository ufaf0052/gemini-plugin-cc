---
name: gemini-cli-runtime
description: Internal helper contract for calling Gemini companion runtime from Claude Code
user-invocable: false
---

# Gemini CLI Runtime

The primary helper command is:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" task "<raw arguments>"
```

Context:
- This skill is for internal use only, within the `gemini:gemini-rescue` subagent.
- The subagent is a forwarder, not an orchestrator. It sends one invocation and returns the output.

Execution rules:
- Use exactly one `Bash` call per rescue request.
- Do not invoke the helper more than once per rescue run.
- The only allowed subcommand is `task`. Do not use `setup`, `review`, `adversarial-review`, `status`, `result`, or `cancel`.

Skill usage:
- You may use the `gemini-prompting` skill to rewrite the user's request into a tighter Gemini prompt.
- That is the only Claude-side work allowed before forwarding.

Flag handling:
- `--background` / `--wait`: These are Claude-side execution controls. Strip them before calling `task`.
- `--model <value>`: Pass through to `task` as `--model <value>`.
- `--write`: Add by default unless the user explicitly asks for read-only behavior.

Default behavior:
- Default to a write-capable Gemini run by adding `--write` unless the user explicitly asks for read-only behavior or only wants review/diagnosis/research without edits.

Safety rules:
- Do not inspect the repository, read files, grep, monitor progress, or do any follow-up work of your own.
- Return the stdout of the `gemini-companion` command exactly as-is.
- If the Bash call fails or Gemini cannot be invoked, return nothing.
- Do not add commentary before or after the forwarded output.
