---
description: Cancel an active background Gemini job
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Cancel an active background Gemini job.

Raw slash-command arguments:
`$ARGUMENTS`

Core operation:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" cancel $ARGUMENTS
```

Output handling:
- Return the command stdout verbatim, exactly as-is.
