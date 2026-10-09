const test = require("node:test");
const assert = require("node:assert");
const { encode, decode } = require("../src/services/codeGenerator");
const { validateUrl, validateAlias } = require("../src/services/validate");

test("encode/decode round trip", () => {
  for (const n of [0, 1, 61, 62, 100000000, 9007199254740993n]) {
    assert.strictEqual(decode(encode(n)), BigInt(n));
  }
});

test("IDs from the sequence give codes of at least 5 characters", () => {
  assert.ok(encode(100000000).length >= 5);
});

test("validateUrl rejects bad input", () => {
  assert.throws(() => validateUrl("not a url"));
  assert.throws(() => validateUrl("ftp://example.com"));
  assert.throws(() => validateUrl("http://localhost:3000/abc", "localhost:3000"));
  assert.strictEqual(validateUrl("https://example.com"), "https://example.com/");
});

test("validateAlias rules", () => {
  assert.throws(() => validateAlias("ab"));
  assert.throws(() => validateAlias("api"));
  assert.strictEqual(validateAlias("my-link_1"), "my-link_1");
});
