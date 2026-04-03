import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { makeTempDir, initGitRepo, run } from "./helpers.mjs";

import { resolveReviewTarget } from "../plugins/gemini/scripts/lib/git.mjs";

test("resolveReviewTarget prefers working tree when repo is dirty", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "a.txt"), "initial\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "a.txt"), "changed\n");

  const target = resolveReviewTarget(cwd, {});
  assert.equal(target.mode, "working-tree");
});

test("resolveReviewTarget falls back to branch diff when repo is clean", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "a.txt"), "initial\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "a.txt"), "changed\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "second"], { cwd });

  const target = resolveReviewTarget(cwd, {});
  assert.equal(target.mode, "branch");
});

test("resolveReviewTarget honors explicit base overrides", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "a.txt"), "initial\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  run("git", ["checkout", "-b", "feature"], { cwd });
  fs.writeFileSync(path.join(cwd, "b.txt"), "feature\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "feature"], { cwd });

  const target = resolveReviewTarget(cwd, { base: "main" });
  assert.equal(target.mode, "branch");
  assert.equal(target.baseRef, "main");
});

test("resolveReviewTarget requires explicit base when no default branch can be inferred", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "a.txt"), "initial\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  // Delete the main branch so there's no default branch
  run("git", ["checkout", "--orphan", "orphan-branch"], { cwd });
  run("git", ["branch", "-D", "main"], { cwd });
  fs.writeFileSync(path.join(cwd, "b.txt"), "orphan\n");
  run("git", ["add", "."], { cwd });
  run("git", ["commit", "-m", "orphan"], { cwd });

  assert.throws(() => resolveReviewTarget(cwd, {}), /branch|base/i);
});
