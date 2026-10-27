/* eslint-disable @typescript-eslint/no-require-imports -- Node's built-in test runner executes this CommonJS test file. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readCheckoutJson, MAX_CHECKOUT_BODY_BYTES } = require("../.test-build/checkout-http.js");

test("rejects non-JSON content types with 415", async () => {
  const result = await readCheckoutJson(new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}",
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 415);
});

test("rejects malformed JSON with 400", async () => {
  const result = await readCheckoutJson(new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-json",
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("accepts a valid JSON body", async () => {
  const result = await readCheckoutJson(new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hello: "world" }),
  }));
  assert.deepEqual(result, { ok: true, body: { hello: "world" } });
});

test("rejects a declared body larger than 64 KiB before reading", async () => {
  const result = await readCheckoutJson(new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(MAX_CHECKOUT_BODY_BYTES + 1) },
    body: "{}",
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("rejects a streamed oversized body even without Content-Length", async () => {
  const oversized = new Uint8Array(MAX_CHECKOUT_BODY_BYTES + 1);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(oversized);
      controller.close();
    },
  });
  const result = await readCheckoutJson(new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});
