---
description: Show active and recent Gemini jobs and review-gate status
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Show the current status of Gemini jobs.

Raw slash-command arguments:
`$ARGUMENTS`

Core operation:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" status $ARGUMENTS
```

Output handling:
- Return the command stdout verbatim, exactly as-is.
- When no job ID is given, the output is a compact Markdown table.
- When a job ID is given, present the full output without summarization or condensing.
