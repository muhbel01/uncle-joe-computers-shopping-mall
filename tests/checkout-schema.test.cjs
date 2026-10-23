const test = require("node:test");
const assert = require("node:assert/strict");
const { checkoutRequestSchema } = require("../.test-build/checkout-schema.js");

const productId = "11111111-1111-4111-8111-111111111111";
const requestKey = "22222222-2222-4222-8222-222222222222";

function validPayload(overrides = {}) {
  return {
    requestKey,
    customer: { name: "Test Customer", phone: "+234 801 234 5678", email: "customer@example.com" },
    fulfilmentMethod: "delivery",
    deliveryAddress: { address: "12 Test Street", city: "Osogbo", state: "Osun" },
    customerNote: "",
    items: [{ productId, quantity: 2 }],
    ...overrides,
  };
}

test("accepts a valid delivery checkout payload", () => {
  assert.equal(checkoutRequestSchema.safeParse(validPayload()).success, true);
});

test("accepts pickup without requiring a delivery address", () => {
  const payload = validPayload({
    fulfilmentMethod: "pickup",
    deliveryAddress: { address: "", city: "", state: "" },
  });
  assert.equal(checkoutRequestSchema.safeParse(payload).success, true);
});

test("rejects an invalid request key and product ID", () => {
  const payload = validPayload({ requestKey: "not-a-uuid" });
  assert.equal(checkoutRequestSchema.safeParse(payload).success, false);
  assert.equal(
    checkoutRequestSchema.safeParse(validPayload({ items: [{ productId: "bad-id", quantity: 1 }] })).success,
    false,
  );
});

test("rejects missing delivery address fields", () => {
  const payload = validPayload({
    deliveryAddress: { address: "", city: "Osogbo", state: "Osun" },
  });
  assert.equal(checkoutRequestSchema.safeParse(payload).success, false);
});

test("rejects invalid phone and email values", () => {
  assert.equal(
    checkoutRequestSchema.safeParse(validPayload({ customer: { name: "Test Customer", phone: "123", email: "" } })).success,
    false,
  );
  assert.equal(
    checkoutRequestSchema.safeParse(validPayload({ customer: { name: "Test Customer", phone: "08012345678", email: "not-an-email" } })).success,
    false,
  );
});

test("rejects duplicate products and invalid quantities", () => {
  assert.equal(
    checkoutRequestSchema.safeParse(validPayload({ items: [{ productId, quantity: 1 }, { productId, quantity: 2 }] })).success,
    false,
  );
  for (const quantity of [0, -1, 1.5, 51]) {
    assert.equal(
      checkoutRequestSchema.safeParse(validPayload({ items: [{ productId, quantity }] })).success,
      false,
      `quantity ${quantity} should be rejected`,
    );
  }
});

test("rejects empty carts, oversized carts, and unexpected fields", () => {
  assert.equal(checkoutRequestSchema.safeParse(validPayload({ items: [] })).success, false);
  assert.equal(
    checkoutRequestSchema.safeParse(validPayload({
      items: Array.from({ length: 51 }, (_, i) => ({
        productId: `33333333-3333-4333-8333-${String(i).padStart(12, "0")}`,
        quantity: 1,
      })),
    })).success,
    false,
  );
  assert.equal(checkoutRequestSchema.safeParse({ ...validPayload(), total: 1 }).success, false);
});
