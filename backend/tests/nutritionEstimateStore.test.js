const test = require("node:test");
const assert = require("node:assert/strict");
const {
  clearEstimateSnapshots,
  consumeEstimateSnapshot,
  createEstimateSnapshot,
  getEstimateSnapshot
} = require("../services/nutritionEstimateStore");

test.beforeEach(() => clearEstimateSnapshots());

test("stores and consumes a one-time meal estimate", () => {
  const created = createEstimateSnapshot({ userId: 4, estimate: { calories: 600 } });
  assert.equal(getEstimateSnapshot(created.estimateId).userId, 4);
  assert.equal(consumeEstimateSnapshot(created.estimateId).estimate.calories, 600);
  assert.equal(getEstimateSnapshot(created.estimateId), null);
});

test("expired meal estimates are unavailable", async () => {
  const created = createEstimateSnapshot({ userId: 4 }, 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(getEstimateSnapshot(created.estimateId), null);
});
