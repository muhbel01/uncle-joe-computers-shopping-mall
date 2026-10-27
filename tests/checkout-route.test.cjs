/* eslint-disable @typescript-eslint/no-require-imports -- Node's built-in test runner executes this CommonJS test file. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { createCheckoutPostHandler } = require("../.test-build/checkout-route.js");

const productId = "11111111-1111-4111-8111-111111111111";
const requestKey = "22222222-2222-4222-8222-222222222222";

function validPayload(overrides = {}) {
  return {
    requestKey,
    customer: { name: "Test Customer", phone: "+234 801 234 5678", email: "customer@example.com" },
    fulfilmentMethod: "pickup",
    deliveryAddress: { address: "", city: "", state: "" },
    customerNote: "",
    items: [{ productId, quantity: 1 }],
    ...overrides,
  };
}

function request(body, contentType = "application/json") {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function dependencies({ data = { order_id: "order-1", order_number: "UJ-1001", order_total: "1000", currency: "NGN" }, error = null, throws = false } = {}) {
  let clientCalls = 0;
  let rpcCalls = 0;
  const deps = {
    logError() {},
    rateLimit: async () => ({ allowed: true }),
    async createClient() {
      clientCalls++;
      if (throws) throw new Error("secret database details");
      return {
        async rpc(name, args) {
          rpcCalls++;
          assert.equal(name, "create_guest_order");
          assert.deepEqual(args.p_payload, validPayload());
          return { data, error };
        },
      };
    },
  };
  return { deps, counts: () => ({ clientCalls, rpcCalls }) };
}

test("rejects non-JSON before creating a database client", async () => {
  const mock = dependencies();
  const response = await createCheckoutPostHandler(mock.deps)(request("{}", "text/plain"));
  assert.equal(response.status, 415);
  assert.equal(mock.counts().clientCalls, 0);
});

test("rejects invalid customer data and does not call the RPC", async () => {
  const mock = dependencies();
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload({
    customer: { name: "", phone: "12", email: "bad" },
  })));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok(body.fieldErrors.customer);
  assert.equal(mock.counts().rpcCalls, 0);
});

test("returns a created unpaid order on valid checkout", async () => {
  const mock = dependencies();
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload()));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.order.id, "order-1");
  assert.equal(body.order.total, 1000);
  assert.equal(body.order.paymentStatus, "unpaid");
  assert.equal(mock.counts().rpcCalls, 1);
});

test("maps stock conflicts without exposing database errors", async () => {
  const mock = dependencies({ error: { code: "P0001", message: "internal SQL detail" } });
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload()));
  assert.equal(response.status, 409);
  assert.doesNotMatch(await response.text(), /internal SQL detail|P0001/);
});

test("returns generic failure when the client throws", async () => {
  const mock = dependencies({ throws: true });
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload()));
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /secret database details/);
});

test("rejects an unexpected RPC response shape", async () => {
  const mock = dependencies({ data: { order_id: "order-1", order_number: "UJ-1001", order_total: "NaN" } });
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload()));
  assert.equal(response.status, 500);
});


test("blocks checkout when shared rate limiting is unavailable", async () => {
  const mock = dependencies();
  mock.deps.rateLimit = async () => ({ allowed: false, unavailable: true });
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload()));
  assert.equal(response.status, 503);
  assert.equal(mock.counts().clientCalls, 0);
  assert.equal(mock.counts().rpcCalls, 0);
});

test("returns 429 and Retry-After when the checkout limit is exceeded", async () => {
  const mock = dependencies();
  mock.deps.rateLimit = async () => ({ allowed: false, retryAfterSeconds: 37 });
  const response = await createCheckoutPostHandler(mock.deps)(request(validPayload()));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "37");
  assert.equal(mock.counts().clientCalls, 0);
  assert.equal(mock.counts().rpcCalls, 0);
});
