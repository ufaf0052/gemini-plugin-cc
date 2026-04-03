import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PLUGIN_ROOT = path.resolve("plugins/gemini");

test("review command uses background Bash for background flow", () => {
  const content = fs.readFileSync(path.join(PLUGIN_ROOT, "commands/review.md"), "utf8");
  assert.match(content, /run_in_background/i);
  assert.match(content, /gemini-companion\.mjs/);
});

test("adversarial review command accepts focus text", () => {
  const content = fs.readFileSync(path.join(PLUGIN_ROOT, "commands/adversarial-review.md"), "utf8");
  assert.match(content, /focus/i);
  assert.match(content, /gemini-companion\.mjs/);
});

test("command file list matches expected set", () => {
  const commandDir = path.join(PLUGIN_ROOT, "commands");
  const files = fs.readdirSync(commandDir).filter((f) => f.endsWith(".md")).sort();
  assert.deepStrictEqual(files, [
    "adversarial-review.md",
    "cancel.md",
    "rescue.md",
    "result.md",
    "review.md",
    "setup.md",
    "status.md"
  ]);
});

test("rescue command delegates to gemini-rescue subagent", () => {
  const rescueCmd = fs.readFileSync(path.join(PLUGIN_ROOT, "commands/rescue.md"), "utf8");
  const rescueAgent = fs.readFileSync(path.join(PLUGIN_ROOT, "agents/gemini-rescue.md"), "utf8");
  assert.match(rescueCmd, /gemini-rescue/i);
  assert.match(rescueAgent, /gemini-cli-runtime/i);
});

test("hooks enable stop-gate review", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, "hooks/hooks.json"), "utf8"));
  assert.ok(hooks.hooks.Stop, "Stop hook must exist");
  assert.ok(hooks.hooks.Stop.length > 0, "Stop hook must have entries");
  const stopHook = hooks.hooks.Stop[0];
  assert.ok(stopHook.hooks.some((h) => h.command.includes("stop-review-gate-hook")));
});
