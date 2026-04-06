import { spawn } from "node:child_process";
import fs from "node:fs";

import { binaryAvailable } from "./process.mjs";

const GEMINI_BIN = process.env.GEMINI_BIN || "/opt/node/bin/gemini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const EXEC_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 600_000;

export function getGeminiAvailability() {
  const result = binaryAvailable(GEMINI_BIN, ["--version"]);
  return {
    available: result.available,
    detail: result.detail,
    bin: GEMINI_BIN,
    model: GEMINI_MODEL,
    timeoutMs: EXEC_TIMEOUT_MS
  };
}

export function getGeminiLoginStatus() {
  const availability = getGeminiAvailability();
  if (!availability.available) {
    return { available: false, loggedIn: false, detail: availability.detail };
  }
  return { available: true, loggedIn: true, detail: `${GEMINI_MODEL} via ${GEMINI_BIN}` };
}

export function getSessionRuntimeStatus(env) {
  const status = getGeminiLoginStatus();
  if (!status.available) {
    return { label: `not available: ${status.detail}` };
  }
  return { label: `ready (${status.detail})` };
}

export function runGeminiPrompt(prompt, options = {}) {
  const model = options.model || GEMINI_MODEL;
  const timeoutMs = options.timeoutMs || EXEC_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;
    let killTimer = null;

    // Use spawn + stdin pipe instead of execFile + -p arg.
    // Fixes: gemini-cli Issue #6715 (hangs in child_process subprocess)
    // The -p "" flag triggers non-interactive mode; actual prompt arrives via stdin.
    const child = spawn(
      GEMINI_BIN,
      ["-m", model, "-p", ""],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NO_COLOR: "1" }
      }
    );

    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);

      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code !== 0 && !stdout) {
        reject(new Error(`Gemini CLI exited with code ${code}\n${stderr || ""}`));
        return;
      }

      // Partial output recovery: if process was killed but we have stdout, resolve with it
      if (!stdout) {
        const hint = stderr.includes("429") ? " (429 rate-limit detected in stderr)" : "";
        reject(new Error(`Gemini CLI returned empty stdout${hint}`));
        return;
      }

      resolve({
        status: code ?? 0,
        stdout,
        stderr,
        finalMessage: stdout
      });
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);
      reject(new Error(`Gemini CLI spawn error: ${err.message}`));
    });

    // Write prompt via stdin, then close
    child.stdin.write(prompt);
    child.stdin.end();

    // Manual timeout with SIGTERM -> SIGKILL escalation
    killTimer = setTimeout(() => {
      if (settled) return;
      // Collect whatever stdout we have so far
      const partialStdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      if (partialStdout) {
        // We have partial output — resolve with it instead of rejecting
        settled = true;
        resolve({
          status: 124,
          stdout: partialStdout,
          stderr: Buffer.concat(stderrChunks).toString("utf8").trim(),
          finalMessage: partialStdout
        });
      }
      try { child.kill("SIGTERM"); } catch {}
      // Force kill after 5s if still alive
      setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
        if (!settled) {
          settled = true;
          reject(new Error(`Gemini CLI timed out after ${timeoutMs / 1000}s (model: ${model})`));
        }
      }, 5000);
    }, timeoutMs);
  });
}

export function parseStructuredOutput(rawText, fallback = {}) {
  const text = String(rawText ?? "").trim();
  if (!text) {
    return {
      parsed: null,
      rawOutput: text,
      parseError: fallback.failureMessage || "Empty output from Gemini."
    };
  }

  // Try direct JSON parse
  try {
    return { parsed: JSON.parse(text), rawOutput: text, parseError: null };
  } catch {
    // continue
  }

  // Try extracting from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
  if (fenceMatch) {
    try {
      return { parsed: JSON.parse(fenceMatch[1].trim()), rawOutput: text, parseError: null };
    } catch {
      // continue
    }
  }

  // Try finding JSON object in text
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    try {
      const candidate = text.slice(objectStart, objectEnd + 1);
      return { parsed: JSON.parse(candidate), rawOutput: text, parseError: null };
    } catch {
      // continue
    }
  }

  return {
    parsed: null,
    rawOutput: text,
    parseError: `Could not parse JSON from Gemini output (${text.length} bytes).`
  };
}

export function readOutputSchema(schemaPath) {
  try {
    return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch {
    return null;
  }
}
