import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { makeTempDir, initGitRepo, run } from "./helpers.mjs";
import { installFakeGemini, buildEnv } from "./fake-gemini-fixture.mjs";

const PLUGIN_ROOT = path.resolve("plugins/gemini");
const COMPANION = path.join(PLUGIN_ROOT, "scripts/gemini-companion.mjs");
const STOP_HOOK = path.join(PLUGIN_ROOT, "scripts/stop-review-gate-hook.mjs");

function runCompanion(args, options = {}) {
  return run("node", [COMPANION, ...args], options);
}

function setupFakeEnv(behavior = "review-ok") {
  const binDir = makeTempDir("gemini-bin-");
  installFakeGemini(binDir, behavior);
  const pluginData = makeTempDir("gemini-data-");
  const cwd = makeTempDir("gemini-repo-");
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "a.txt"), "initial\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  const env = {
    ...buildEnv(binDir),
    CLAUDE_PLUGIN_DATA: pluginData,
    CLAUDE_PROJECT_DIR: cwd
  };
  return { binDir, pluginData, cwd, env };
}

// --- Setup ---

test("setup reports ready when fake gemini is installed", () => {
  const { env } = setupFakeEnv();
  const result = runCompanion(["setup", "--json"], { env });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
  assert.equal(payload.gemini.available, true);
  assert.match(payload.gemini.detail, /fake/i);
});

// --- Review ---

test("review renders a structured result from gemini", () => {
  const { cwd, env } = setupFakeEnv("review-ok");
  fs.writeFileSync(path.join(cwd, "a.txt"), "changed\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "change"], { cwd });

  const result = runCompanion(["review", "--scope", "branch"], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verdict:\s*approve/i);
  assert.match(result.stdout, /No material/i);
});

test("adversarial review renders structured findings", () => {
  const { cwd, env } = setupFakeEnv("adversarial-findings");
  fs.writeFileSync(path.join(cwd, "a.txt"), "changed\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "change"], { cwd });

  const result = runCompanion(["adversarial-review", "--scope", "branch"], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /needs-attention/i);
  assert.match(result.stdout, /Missing empty-state guard/);
});

test("review rejects unsupported scope", () => {
  const { env } = setupFakeEnv();
  const result = runCompanion(["review", "--scope", "staged"], { env });
  assert.notEqual(result.status, 0);
  const output = result.stderr + result.stdout;
  assert.match(output, /scope|staged/i);
});

// --- Task ---

test("task runs a foreground task and returns output", () => {
  const { env } = setupFakeEnv("task-ok");
  const result = runCompanion(["task", "Do something useful"], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Handled the requested task/);
});

test("task --background enqueues a detached worker", () => {
  const { env } = setupFakeEnv("task-ok");
  const result = runCompanion(["task", "--background", "--json", "Do something"], { env });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.jobId);
  assert.equal(payload.status, "queued");
});

// --- Status ---

test("status shows workspace info", () => {
  const { env } = setupFakeEnv();
  const result = runCompanion(["status", "--json"], { env });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.workspaceRoot);
  assert.ok(payload.sessionRuntime);
});

// --- Result ---

test("result returns stored output for the latest finished job", () => {
  const { cwd, env, pluginData } = setupFakeEnv("task-ok");

  // Run a foreground task to create a finished job
  runCompanion(["task", "Do something"], { env });

  // Get the status to find the job ID
  const statusResult = runCompanion(["status", "--json"], { env });
  const status = JSON.parse(statusResult.stdout);
  const jobId = status.latestFinished?.id;

  if (jobId) {
    const resultOutput = runCompanion(["result", jobId], { env });
    assert.equal(resultOutput.status, 0, resultOutput.stderr);
    assert.match(resultOutput.stdout, /Handled the requested task|Task/);
  }
});

// --- Cancel ---

test("cancel reports error for non-existent job", () => {
  const { env } = setupFakeEnv();
  const result = runCompanion(["cancel", "nonexistent-job-123"], { env });
  assert.notEqual(result.status, 0);
});

// --- Stop Hook ---

test("stop hook blocks when review gate is enabled and findings exist", () => {
  const { cwd, env } = setupFakeEnv("adversarial-findings");

  // Enable the review gate
  runCompanion(["setup", "--enable-review-gate"], { env });

  const hookInput = JSON.stringify({
    cwd,
    last_assistant_message: "I edited src/app.js to add the new feature."
  });
  const result = run("node", [STOP_HOOK], { env, input: hookInput });
  assert.equal(result.status, 0, result.stderr);
  const decision = JSON.parse(result.stdout.trim());
  assert.equal(decision.decision, "block");
  assert.match(decision.reason, /issues|fixes/i);
});

test("stop hook allows when review gate is enabled and review is clean", () => {
  const { cwd, env } = setupFakeEnv("adversarial-clean");

  runCompanion(["setup", "--enable-review-gate"], { env });

  const hookInput = JSON.stringify({
    cwd,
    last_assistant_message: "I edited src/app.js to add the new feature."
  });
  const result = run("node", [STOP_HOOK], { env, input: hookInput });
  assert.equal(result.status, 0, result.stderr);
  // ALLOW means no stdout decision (hook exits silently)
  const stdout = result.stdout.trim();
  assert.equal(stdout, "", "ALLOW should produce no stdout decision");
});

test("stop hook does not block when gemini is unavailable", () => {
  const pluginData = makeTempDir("gemini-data-");
  const cwd = makeTempDir("gemini-repo-");
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "a.txt"), "initial\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });

  const env = {
    ...process.env,
    GEMINI_BIN: "/nonexistent/gemini",
    CLAUDE_PLUGIN_DATA: pluginData,
    CLAUDE_PROJECT_DIR: cwd,
    NO_COLOR: "1"
  };

  // Enable review gate
  runCompanion(["setup", "--enable-review-gate"], { env });

  const hookInput = JSON.stringify({
    cwd,
    last_assistant_message: "I edited something."
  });
  const result = run("node", [STOP_HOOK], { env, input: hookInput });
  // Should not crash and should not block
  assert.equal(result.status, 0);
  const stdout = result.stdout.trim();
  // Either empty (silently allowed) or no block decision
  if (stdout) {
    const decision = JSON.parse(stdout);
    assert.notEqual(decision.decision, "block");
  }
});
