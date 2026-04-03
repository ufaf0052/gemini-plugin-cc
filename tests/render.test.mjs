import test from "node:test";
import assert from "node:assert/strict";

import {
  renderReviewResult,
  renderStoredJobResult,
  renderTaskResult
} from "../plugins/gemini/scripts/lib/render.mjs";

test("renderReviewResult degrades gracefully when JSON is missing required review fields", () => {
  const parsed = { parsed: { assessment: "ok" }, rawOutput: '{"assessment":"ok"}', parseError: null };
  const rendered = renderReviewResult(parsed, { reviewLabel: "Review", targetLabel: "branch diff" });
  assert.match(rendered, /unexpected review shape/);
  assert.match(rendered, /Missing/);
});

test("renderStoredJobResult prefers rendered output for structured review jobs", () => {
  const job = { id: "review-abc", title: "Gemini Review", status: "completed", summary: "ok" };
  const storedJob = {
    result: { result: {}, parseError: null },
    rendered: "# Gemini Review\n\nTarget: branch diff\nVerdict: approve\n\nNo material issues found.\n"
  };
  const output = renderStoredJobResult(job, storedJob);
  assert.match(output, /Gemini Review/);
  assert.match(output, /approve/);
});

test("renderTaskResult returns raw output when available", () => {
  const output = renderTaskResult({ rawOutput: "Task completed successfully." });
  assert.match(output, /Task completed successfully/);
});
