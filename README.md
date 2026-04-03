# Gemini plugin for Claude Code

Use Gemini from inside Claude Code for code reviews or to delegate tasks to Gemini.

This plugin is for Claude Code users who want an easy way to use Gemini's adversarial code review from the workflow they already have.

## What You Get

- `/gemini:review` for an adversarial read-only Gemini review
- `/gemini:adversarial-review` for a steerable challenge review with custom focus text
- `/gemini:rescue`, `/gemini:status`, `/gemini:result`, and `/gemini:cancel` to delegate work and manage background jobs
- `/gemini:setup` to check Gemini CLI readiness and manage the stop-time review gate

## Requirements

- **Gemini CLI** installed and accessible (via `GEMINI_BIN` env or at `/opt/node/bin/gemini`)
- **Node.js 18.18 or later**

## Install

Add the marketplace in Claude Code:

```bash
/plugin marketplace add ufaf0052/gemini-plugin-cc
```

Install the plugin:

```bash
/plugin install gemini@gemini-plugin-cc
```

Reload plugins:

```bash
/reload-plugins
```

Then run:

```bash
/gemini:setup
```

`/gemini:setup` will tell you whether Gemini is ready. If Gemini CLI is not found, it will provide guidance on setting the `GEMINI_BIN` environment variable.

After install, you should see:

- the slash commands listed below
- the `gemini:gemini-rescue` subagent in `/agents`

One simple first run is:

```bash
/gemini:review --wait
/gemini:status
/gemini:result
```

## Usage

### `/gemini:review`

Runs an adversarial Gemini review on your current work. Returns structured JSON output with verdict, findings (severity + file:line + confidence), and next steps.

Use it when you want:

- a review of your current uncommitted changes
- a review of your branch compared to a base branch like `main`

Use `--base <ref>` for branch review. Supports `--wait` and `--background`.

Examples:

```bash
/gemini:review
/gemini:review --base main
/gemini:review --background
```

### `/gemini:adversarial-review`

Same as `/gemini:review` but accepts custom focus text to steer the adversarial review toward specific concerns.

Examples:

```bash
/gemini:adversarial-review focus on auth and API contract changes
/gemini:adversarial-review --base main focus on race conditions
```

### `/gemini:rescue`

Delegate investigation, diagnosis, or analysis tasks to Gemini.

Examples:

```bash
/gemini:rescue diagnose why the auth tests are failing
/gemini:rescue --background analyze the performance regression in the API layer
```

### `/gemini:setup`

Check Gemini CLI availability and manage the stop-time review gate.

```bash
/gemini:setup
/gemini:setup --enable-review-gate
/gemini:setup --disable-review-gate
```

### `/gemini:status`

Show active and recent Gemini jobs.

```bash
/gemini:status
/gemini:status <job-id>
```

### `/gemini:result`

Retrieve stored final output for a finished Gemini job.

```bash
/gemini:result
/gemini:result <job-id>
```

### `/gemini:cancel`

Cancel an active background Gemini job.

```bash
/gemini:cancel
/gemini:cancel <job-id>
```

## Architecture

This plugin is modeled after [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc). Key differences:

- **No app-server/broker** — Gemini CLI is invoked directly via `execFile` (stateless)
- **No persistent sessions** — no thread resume or session management
- **Adversarial by default** — both `/gemini:review` and `/gemini:adversarial-review` use the same XML-structured adversarial prompt with grounding rules, calibration rules, and structured JSON output

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_BIN` | `/opt/node/bin/gemini` | Path to Gemini CLI binary |
| `GEMINI_MODEL` | `gemini-2.5-pro` | Model to use |
| `GEMINI_TIMEOUT_MS` | `600000` (10 min) | CLI execution timeout |

## License

MIT
