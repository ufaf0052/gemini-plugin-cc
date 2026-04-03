import test from "node:test";
import assert from "node:assert/strict";

import { terminateProcessTree } from "../plugins/gemini/scripts/lib/process.mjs";

test("terminateProcessTree uses taskkill on Windows", () => {
  let capturedCommand = null;
  let capturedArgs = null;

  const result = terminateProcessTree(12345, {
    platform: "win32",
    runCommandImpl: (command, args) => {
      capturedCommand = command;
      capturedArgs = args;
      return { error: null, status: 0, stdout: "", stderr: "" };
    }
  });

  assert.equal(capturedCommand, "taskkill");
  assert.deepStrictEqual(capturedArgs, ["/PID", "12345", "/T", "/F"]);
  assert.equal(result.attempted, true);
  assert.equal(result.delivered, true);
  assert.equal(result.method, "taskkill");
});

test("terminateProcessTree treats missing Windows processes as already stopped", () => {
  const result = terminateProcessTree(99999, {
    platform: "win32",
    runCommandImpl: () => ({
      error: null,
      status: 128,
      stdout: "",
      stderr: "ERROR: The process not found."
    })
  });

  assert.equal(result.attempted, true);
  assert.equal(result.delivered, false);
  assert.equal(result.method, "taskkill");
});
