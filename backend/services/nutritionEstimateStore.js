const { randomUUID } = require("crypto");

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const estimates = new Map();

function cleanupExpired(now = Date.now()) {
  for (const [estimateId, snapshot] of estimates.entries()) {
    if (snapshot.expiresAtMs <= now) estimates.delete(estimateId);
  }
}

function createEstimateSnapshot(payload, ttlMs = DEFAULT_TTL_MS) {
  cleanupExpired();
  const estimateId = randomUUID();
  const expiresAtMs = Date.now() + ttlMs;
  estimates.set(estimateId, { ...payload, estimateId, expiresAtMs });
  return { estimateId, expiresAt: new Date(expiresAtMs).toISOString() };
}

function getEstimateSnapshot(estimateId) {
  cleanupExpired();
  return estimates.get(estimateId) || null;
}

function consumeEstimateSnapshot(estimateId) {
  const snapshot = getEstimateSnapshot(estimateId);
  if (snapshot) estimates.delete(estimateId);
  return snapshot;
}

function clearEstimateSnapshots() {
  estimates.clear();
}

module.exports = {
  clearEstimateSnapshots,
  consumeEstimateSnapshot,
  createEstimateSnapshot,
  getEstimateSnapshot
};
