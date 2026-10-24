/* eslint-disable @typescript-eslint/no-require-imports -- Node's built-in test runner executes this CommonJS test file. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkoutRpcErrorResponse, checkoutSuccessResponse } = require("../.test-build/checkout-api.js");

test("maps stock and unavailable-product errors to a safe conflict response", () => {
  for (const code of ["P0001", "P0002"]) {
    const result = checkoutRpcErrorResponse(code);
    assert.equal(result.status, 409);
    assert.match(result.body.error, /cart/i);
    assert.doesNotMatch(result.body.error, /postgres|sql|constraint|stack/i);
  }
});

test("maps invalid database arguments to a safe 400 response", () => {
  assert.equal(checkoutRpcErrorResponse("22023").status, 400);
});

test("maps disabled checkout to 503", () => {
  const result = checkoutRpcErrorResponse("55000");
  assert.equal(result.status, 503);
  assert.match(result.body.error, /not enabled/i);
});

test("hides unknown database errors behind a generic 500 message", () => {
  const result = checkoutRpcErrorResponse("XX000");
  assert.equal(result.status, 500);
  assert.match(result.body.error, /couldn't place your order/i);
  assert.doesNotMatch(result.body.error, /XX000|database|postgres/i);
});

test("builds the unpaid order response with server-returned total and default currency", () => {
  assert.deepEqual(checkoutSuccessResponse({
    order_id: "order-1",
    order_number: "UJ-1001",
    order_total: "12500.50",
    currency: null,
  }, "pickup"), {
    order: {
      id: "order-1",
      number: "UJ-1001",
      total: 12500.5,
      currency: "NGN",
      paymentStatus: "unpaid",
      fulfilmentMethod: "pickup",
    },
    message: "Your order has been created. Payment has not been taken.",
  });
});

test("rejects incomplete, negative, and non-finite order totals", () => {
  assert.equal(checkoutSuccessResponse(null, "pickup"), null);
  assert.equal(checkoutSuccessResponse({ order_id: "x", order_number: "y" }, "pickup"), null);
  assert.equal(checkoutSuccessResponse({ order_id: "x", order_number: "y", order_total: -1 }, "pickup"), null);
  assert.equal(checkoutSuccessResponse({ order_id: "x", order_number: "y", order_total: "NaN" }, "pickup"), null);
});
