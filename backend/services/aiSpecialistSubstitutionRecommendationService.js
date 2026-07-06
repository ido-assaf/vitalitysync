const { withEvidence } = require("./aiSpecialistProfessionalRulePackService");

const SUBSTITUTION_RECOMMENDATION_VERSION = "fitness_substitution_recommendation_v0.1";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasAny(values = [], candidates = []) {
  return candidates.some((candidate) => values.includes(candidate));
}

function reasonCodesFrom({ adaptationDecisions = {}, planUpdateProposal = {} } = {}) {
  return unique([
    ...(adaptationDecisions.readinessReasonCodes || []),
    ...(adaptationDecisions.reasonCodes || []),
    ...(planUpdateProposal.reasonCodes || [])
  ]);
}

function substitutionRecommendations({ adaptationDecisions = {}, planUpdateProposal = {} } = {}) {
  const reasonCodes = reasonCodesFrom({ adaptationDecisions, planUpdateProposal });
  const changes = Array.isArray(planUpdateProposal.proposedChanges)
    ? planUpdateProposal.proposedChanges
    : [];
  const substitutionChanges = changes.filter((change) => change.type === "review_substitution_candidate");

  return substitutionChanges.map((change) => {
    const localReasonCodes = unique([...(change.reasonCodes || []), ...reasonCodes]);
    const painDriven = hasAny(localReasonCodes, ["recurring_pain", "pain_signal", "recurring_check_in_pain"]);
    const ruleId = painDriven ? "rule_substitution_pain_lower_risk" : "rule_substitution_same_training_intent";

    return withEvidence(
      {
        type: "substitution_candidate_review",
        applyMode: "preview_only",
        decision: painDriven ? "review_lower_risk_substitute" : "review_same_intent_substitute",
        exerciseId: change.exerciseId ?? null,
        exerciseName: change.exerciseName || null,
        reasonCodes: localReasonCodes,
        candidateCriteria: [
          "same_or_similar_movement_pattern",
          "same_primary_muscle_when_safe",
          "available_equipment",
          "appropriate_level",
          "not_disliked",
          painDriven ? "lower_risk_for_reported_pain" : "preserve_training_intent"
        ],
        recommendation: painDriven
          ? "Review a lower-risk substitute before progressing the painful pattern."
          : "Review an available substitute that preserves the training intent."
      },
      ruleId
    );
  });
}

function buildSubstitutionRecommendations(args = {}) {
  return {
    version: SUBSTITUTION_RECOMMENDATION_VERSION,
    applyMode: "preview_only",
    recommendations: substitutionRecommendations(args)
  };
}

module.exports = {
  SUBSTITUTION_RECOMMENDATION_VERSION,
  buildSubstitutionRecommendations,
  _internals: {
    reasonCodesFrom
  }
};
