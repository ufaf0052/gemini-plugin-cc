---
description: Check Gemini CLI readiness and manage the stop-time review gate
argument-hint: '[--enable-review-gate|--disable-review-gate]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(npm:*), Bash(which:*), AskUserQuestion
---

Check whether the Gemini CLI is ready for use.

Raw slash-command arguments:
`$ARGUMENTS`

Core operation:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" setup --json $ARGUMENTS
```

If the output indicates Gemini is not available:
- Check if `npm` is available.
- If npm is available, ask the user whether they'd like to install the Gemini CLI using `AskUserQuestion`.
- If the user agrees, run:
```bash
npm install -g @anthropic-ai/claude-code
```
- After installation, re-run the setup check.

Output handling:
- Present the setup report to the user.
- If Gemini is not available, include guidance on setting `GEMINI_BIN` env variable.
- Pass through any review-gate toggle messages.
