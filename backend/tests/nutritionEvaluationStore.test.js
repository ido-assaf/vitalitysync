const test = require("node:test");
const assert = require("node:assert/strict");
const {
  clearEvaluationSnapshots,
  consumeEvaluationSnapshot,
  createEvaluationSnapshot,
  getEvaluationSnapshot
} = require("../services/nutritionEvaluationStore");

test.beforeEach(() => clearEvaluationSnapshots());

test("stores and consumes a one-time nutrition evaluation snapshot", () => {
  const created = createEvaluationSnapshot({ userId: 7, evaluation: { status: "neutral" } });

  assert.equal(getEvaluationSnapshot(created.evaluationId).userId, 7);
  assert.equal(consumeEvaluationSnapshot(created.evaluationId).evaluation.status, "neutral");
  assert.equal(getEvaluationSnapshot(created.evaluationId), null);
});

test("expired nutrition evaluation snapshots are unavailable", async () => {
  const created = createEvaluationSnapshot({ userId: 7 }, 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(getEvaluationSnapshot(created.evaluationId), null);
});
