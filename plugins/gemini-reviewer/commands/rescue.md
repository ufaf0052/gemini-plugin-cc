---
description: Delegate an investigation, fix request, or analysis task to Gemini
argument-hint: '[--wait|--background] [--model <model>] [prompt ...]'
context: fork
allowed-tools: Bash(node:*), Bash(git:*), AskUserQuestion
---

Delegate a task to the gemini-rescue subagent.

Raw slash-command arguments:
`$ARGUMENTS`

Execution mode rules:
- If the raw arguments include `--background`, launch the subagent with `Bash(run_in_background: true)`.
- If the raw arguments include `--wait`, run in the foreground (default).
- Otherwise, prefer foreground for small, clearly bounded tasks. Recommend background for complicated, open-ended, or likely long-running tasks.
- Use `AskUserQuestion` exactly once with two options if the mode is ambiguous:
  - `Wait for results`
  - `Run in background`

Argument handling:
- Preserve the user's prompt text exactly.
- `--model <value>` is forwarded to the companion script.
- Do not add extra instructions or rewrite the user's intent.

Core operation:
- The gemini-rescue subagent handles the actual invocation.
- It will run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" task [--write] "$PROMPT"
```

Output handling:
- Return the subagent's stdout verbatim, exactly as-is.
- Do not paraphrase, summarize, or add commentary.
- Do not fix any issues mentioned in the output.
