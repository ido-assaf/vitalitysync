const {
  PROFESSIONAL_RULES,
  PROFESSIONAL_SOURCE_ITEMS
} = require("./aiSpecialistKnowledgeBase");

const ruleMap = new Map(PROFESSIONAL_RULES.map((rule) => [rule.id, rule]));
const sourceMap = new Map(PROFESSIONAL_SOURCE_ITEMS.map((source) => [source.id, source]));

function professionalRuleById(ruleId) {
  return ruleMap.get(ruleId) || null;
}

function sourceItemById(sourceItemId) {
  return sourceMap.get(sourceItemId) || null;
}

function evidenceForRule(ruleId) {
  const rule = professionalRuleById(ruleId);

  if (!rule) {
    throw new Error(`Unknown professional rule: ${ruleId}`);
  }

  return {
    ruleId: rule.id,
    sourceItemIds: rule.sourceItemIds,
    evidenceSummary: rule.evidenceSummary,
    evidenceLevel: rule.evidenceLevel,
    limitations: rule.limitations,
    lastReviewedAt: rule.lastReviewedAt,
    confidence: rule.confidence
  };
}

function withEvidence(payload, ruleId, overrides = {}) {
  return {
    ...payload,
    ...evidenceForRule(ruleId),
    ...overrides
  };
}

module.exports = {
  evidenceForRule,
  professionalRuleById,
  sourceItemById,
  withEvidence,
  _internals: {
    ruleMap,
    sourceMap
  }
};
