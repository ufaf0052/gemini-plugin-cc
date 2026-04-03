import path from "node:path";

import { writeExecutable } from "./helpers.mjs";

export function installFakeGemini(binDir, behavior = "review-ok") {
  const statePath = path.join(binDir, "fake-gemini-state.json");
  const scriptPath = path.join(binDir, "gemini");
  const source = `#!/usr/bin/env node
const fs = require("node:fs");

const STATE_PATH = ${JSON.stringify(statePath)};
const BEHAVIOR = ${JSON.stringify(behavior)};

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

const args = process.argv.slice(2);

if (args[0] === "--version" || args[0] === "-v") {
  console.log("0.99.0-fake");
  process.exit(0);
}

let model = null;
let prompt = null;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "-m" || args[i] === "--model") && args[i + 1]) {
    model = args[i + 1];
    i++;
  } else if ((args[i] === "-p" || args[i] === "--prompt") && args[i + 1]) {
    prompt = args[i + 1];
    i++;
  }
}

saveState({ model, prompt, behavior: BEHAVIOR });

if (BEHAVIOR === "empty-stdout") {
  process.exit(0);
}

if (BEHAVIOR === "slow") {
  setTimeout(() => {
    console.log("Handled the slow task.\\nTask prompt accepted.");
    process.exit(0);
  }, 400);
} else if (BEHAVIOR === "invalid-json") {
  console.log("not valid json at all");
} else if (BEHAVIOR === "task-ok") {
  console.log("Handled the requested task.\\nTask prompt accepted.");
} else if (prompt && prompt.includes("<task>") && prompt.includes("Only review the work from the previous Claude turn")) {
  if (BEHAVIOR === "adversarial-clean") {
    console.log("ALLOW: No blocking issues found in the previous turn.");
  } else {
    console.log("BLOCK: Missing empty-state guard in src/app.js:4-6.");
  }
} else if (prompt && prompt.includes("adversarial")) {
  if (BEHAVIOR === "adversarial-clean" || BEHAVIOR === "review-ok") {
    console.log(JSON.stringify({
      verdict: "approve",
      summary: "No material issues found.",
      findings: [],
      next_steps: []
    }));
  } else {
    console.log(JSON.stringify({
      verdict: "needs-attention",
      summary: "One adversarial concern surfaced.",
      findings: [{
        severity: "high",
        title: "Missing empty-state guard",
        body: "The change assumes data is always present.",
        file: "src/app.js",
        line_start: 4,
        line_end: 6,
        confidence: 0.87,
        recommendation: "Handle empty collections before indexing."
      }],
      next_steps: ["Add an empty-state test."]
    }));
  }
} else {
  console.log(JSON.stringify({
    verdict: "approve",
    summary: "No material issues found.",
    findings: [],
    next_steps: []
  }));
}
`;
  writeExecutable(scriptPath, source);
}

export function buildEnv(binDir) {
  return {
    ...process.env,
    GEMINI_BIN: path.join(binDir, "gemini"),
    NO_COLOR: "1"
  };
}
