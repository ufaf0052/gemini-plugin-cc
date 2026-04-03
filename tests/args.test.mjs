import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs, splitRawArgumentString } from "../plugins/gemini/scripts/lib/args.mjs";

test("parseArgs handles boolean and value options", () => {
  const { options, positionals } = parseArgs(
    ["--json", "--base", "main", "focus text"],
    { booleanOptions: ["json"], valueOptions: ["base"] }
  );
  assert.equal(options.json, true);
  assert.equal(options.base, "main");
  assert.deepStrictEqual(positionals, ["focus text"]);
});

test("parseArgs treats unrecognized flags as positionals", () => {
  const { options, positionals } = parseArgs(
    ["--unknown", "value"],
    { booleanOptions: ["json"] }
  );
  assert.equal(options.json, undefined);
  assert.deepStrictEqual(positionals, ["--unknown", "value"]);
});

test("parseArgs supports alias mapping", () => {
  const { options } = parseArgs(
    ["-m", "gemini-2.5-pro"],
    { valueOptions: ["model"], aliasMap: { m: "model" } }
  );
  assert.equal(options.model, "gemini-2.5-pro");
});

test("parseArgs stops parsing options after --", () => {
  const { options, positionals } = parseArgs(
    ["--json", "--", "--not-a-flag"],
    { booleanOptions: ["json"] }
  );
  assert.equal(options.json, true);
  assert.deepStrictEqual(positionals, ["--not-a-flag"]);
});

test("splitRawArgumentString handles quoted strings and escapes", () => {
  const tokens = splitRawArgumentString('--base main "focus text here" --json');
  assert.deepStrictEqual(tokens, ["--base", "main", "focus text here", "--json"]);
});

test("splitRawArgumentString handles edge cases", () => {
  assert.deepStrictEqual(splitRawArgumentString(""), []);
  assert.deepStrictEqual(splitRawArgumentString("   "), []);
  assert.deepStrictEqual(splitRawArgumentString("single"), ["single"]);
  const withEscape = splitRawArgumentString('hello\\"world');
  assert.deepStrictEqual(withEscape, ['hello"world']);
});
