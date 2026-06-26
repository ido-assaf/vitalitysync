const { randomUUID } = require("crypto");

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const evaluations = new Map();

function cleanupExpired(now = Date.now()) {
  for (const [evaluationId, snapshot] of evaluations.entries()) {
    if (snapshot.expiresAtMs <= now) {
      evaluations.delete(evaluationId);
    }
  }
}

function createEvaluationSnapshot(payload, ttlMs = DEFAULT_TTL_MS) {
  cleanupExpired();
  const evaluationId = randomUUID();
  const expiresAtMs = Date.now() + ttlMs;

  evaluations.set(evaluationId, {
    ...payload,
    evaluationId,
    expiresAtMs
  });

  return {
    evaluationId,
    expiresAt: new Date(expiresAtMs).toISOString()
  };
}

function getEvaluationSnapshot(evaluationId) {
  cleanupExpired();
  return evaluations.get(evaluationId) || null;
}

function consumeEvaluationSnapshot(evaluationId) {
  const snapshot = getEvaluationSnapshot(evaluationId);

  if (snapshot) {
    evaluations.delete(evaluationId);
  }

  return snapshot;
}

function clearEvaluationSnapshots() {
  evaluations.clear();
}

module.exports = {
  clearEvaluationSnapshots,
  consumeEvaluationSnapshot,
  createEvaluationSnapshot,
  getEvaluationSnapshot
};
