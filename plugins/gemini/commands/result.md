---
description: Retrieve stored final output for a finished Gemini job
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Retrieve the stored result for a completed Gemini job.

Raw slash-command arguments:
`$ARGUMENTS`

Core operation:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" result $ARGUMENTS
```

Output handling:
- Return the full command output with all details:
  - Job ID and status
  - Complete result payload (verdict, summary, findings, details, next steps)
  - File paths and line numbers exactly as reported
  - Error messages or parse errors
  - Follow-up commands
- Do not condense or summarize the output.
- Preserve all details.
