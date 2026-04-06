import { execFile } from "node:child_process";
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
    const child = execFile(
      GEMINI_BIN,
      ["-m", model, "-p", prompt],
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: "1" }
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(new Error(`Gemini CLI timed out after ${timeoutMs / 1000}s (model: ${model})`));
          } else {
            reject(new Error(`Gemini CLI error: ${error.message}\n${stderr || ""}`));
          }
          return;
        }
        const result = stdout.trim();
        if (!result) {
          const hint = stderr?.includes("429") ? " (429 rate-limit detected in stderr)" : "";
          reject(new Error(`Gemini CLI returned empty stdout${hint}`));
          return;
        }
        resolve({
          status: 0,
          stdout: result,
          stderr: (stderr || "").trim(),
          finalMessage: result
        });
      }
    );

    if (child.stdin) child.stdin.end();
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
