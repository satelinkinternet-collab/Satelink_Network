// Real unit tests for apps/api/src/utils/canonical_json.js
// Uses Node's built-in node:test runner — zero new dependencies.
//
// Why these functions: canonical JSON + hashing is a correctness primitive
// for any deterministic content addressing (settlement receipts, replay
// detection, etc). The invariant we MUST guarantee is:
//
//   hashObject({a:1, b:2}) === hashObject({b:2, a:1})
//
// If this ever breaks, two semantically-identical payloads will hash
// differently and downstream systems will reject valid duplicates.

import test from "node:test";
import assert from "node:assert/strict";
import {
  sortObject,
  canonicalJSON,
  sha256Hex,
  hashObject,
} from "../src/utils/canonical_json.js";

test("sortObject: sorts top-level keys alphabetically", () => {
  const out = sortObject({ b: 1, a: 2, c: 3 });
  assert.deepEqual(Object.keys(out), ["a", "b", "c"]);
});

test("sortObject: sorts nested object keys recursively", () => {
  const out = sortObject({ z: { y: 1, x: 2 }, a: { c: 1, b: 2 } });
  assert.deepEqual(Object.keys(out), ["a", "z"]);
  assert.deepEqual(Object.keys(out.a), ["b", "c"]);
  assert.deepEqual(Object.keys(out.z), ["x", "y"]);
});

test("sortObject: preserves array order (does NOT sort arrays)", () => {
  const out = sortObject({ list: [3, 1, 2] });
  assert.deepEqual(out.list, [3, 1, 2]);
});

test("canonicalJSON: produces identical output for reordered objects", () => {
  const a = canonicalJSON({ name: "x", id: 1, tags: ["b", "a"] });
  const b = canonicalJSON({ tags: ["b", "a"], id: 1, name: "x" });
  assert.equal(a, b);
});

test("canonicalJSON: deeply nested invariance", () => {
  const a = canonicalJSON({ outer: { z: 1, a: { y: 2, b: 3 } } });
  const b = canonicalJSON({ outer: { a: { b: 3, y: 2 }, z: 1 } });
  assert.equal(a, b);
});

test("sha256Hex: known vector for 'hello'", () => {
  // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
  assert.equal(
    sha256Hex("hello"),
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});

test("hashObject: order-independent hash (THE invariant)", () => {
  const h1 = hashObject({ amount: 100, currency: "USDT", to: "0xabc" });
  const h2 = hashObject({ to: "0xabc", currency: "USDT", amount: 100 });
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/); // valid sha256 hex
});

test("hashObject: different content yields different hash", () => {
  const h1 = hashObject({ amount: 100 });
  const h2 = hashObject({ amount: 101 });
  assert.notEqual(h1, h2);
});
