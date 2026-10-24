/* eslint-disable @typescript-eslint/no-require-imports -- Node's built-in test runner executes this CommonJS test file. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkCheckoutRateLimit, CHECKOUT_RATE_LIMIT_MAX_REQUESTS } = require("../.test-build/checkout-rate-limit.js");

const originalFetch = global.fetch;
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function restoreEnvironment() {
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  global.fetch = originalFetch;
}

test("fails closed when shared limiter credentials are missing", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  global.fetch = async () => { throw new Error("fetch should not be called"); };
  try {
    assert.deepEqual(await checkCheckoutRateLimit(new Request("https://example.test/api/orders", { headers: { "x-real-ip": "203.0.113.12" } })), {
      allowed: false,
      unavailable: true,
    });
  } finally {
    restoreEnvironment();
  }
});

test("fails closed when the trusted client IP header is missing or malformed", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  let fetchCalled = false;
  global.fetch = async () => { fetchCalled = true; throw new Error("fetch should not be called"); };
  try {
    for (const headers of [{}, { "x-real-ip": "not-an-ip" }]) {
      assert.deepEqual(await checkCheckoutRateLimit(new Request("https://example.test/api/orders", { headers })), {
        allowed: false,
        unavailable: true,
      });
    }
    assert.equal(fetchCalled, false);
  } finally {
    restoreEnvironment();
  }
});

test("uses atomic shared Redis command and allows requests below the limit", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  let sent;
  global.fetch = async (url, options) => {
    sent = { url: String(url), options };
    return new Response(JSON.stringify({ result: [CHECKOUT_RATE_LIMIT_MAX_REQUESTS, 60] }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await checkCheckoutRateLimit(new Request("https://example.test/api/orders", {
      headers: { "x-real-ip": "203.0.113.10" },
    }));
    assert.deepEqual(result, { allowed: true });
    assert.equal(sent.url, "https://redis.example.test/");
    assert.equal(sent.options.headers.Authorization, "Bearer test-token");
    assert.equal(sent.options.cache, "no-store");
    const command = JSON.parse(sent.options.body);
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], "1");
    assert.match(command[3], /^checkout:rate:[a-f0-9]{64}$/);
    assert.equal(command[4], "60");
  } finally {
    restoreEnvironment();
  }
});

test("returns retry duration after the shared request limit is exceeded", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  global.fetch = async () => new Response(JSON.stringify({ result: [6, 23] }), {
    status: 200, headers: { "content-type": "application/json" },
  });
  try {
    assert.deepEqual(await checkCheckoutRateLimit(new Request("https://example.test/api/orders", { headers: { "x-real-ip": "203.0.113.11" } })), {
      allowed: false,
      retryAfterSeconds: 23,
    });
  } finally {
    restoreEnvironment();
  }
});

test("fails closed when Redis responds with an error", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  global.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    assert.deepEqual(await checkCheckoutRateLimit(new Request("https://example.test/api/orders")), {
      allowed: false,
      unavailable: true,
    });
  } finally {
    restoreEnvironment();
  }
});
