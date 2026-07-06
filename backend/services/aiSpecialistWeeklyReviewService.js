const { buildFitnessAdaptationDecisions } = require("./aiSpecialistAdaptationDecisionService");
const { buildFitnessPlanUpdateProposal } = require("./aiSpecialistPlanUpdateProposalService");
const { buildFitnessProfessionalRecommendations } = require("./aiSpecialistProfessionalRecommendationService");
const { buildFitnessWeeklyCoachBrief } = require("./aiSpecialistWeeklyCoachBriefService");

const FITNESS_WEEKLY_REVIEW_VERSION = "fitness_weekly_review_v0.1";

function buildFitnessWeeklyReview({
  progressSummary,
  specialistContext = null,
  profile = null,
  expertRules = [],
  knowledgeItems = [],
  checkInSignals = []
} = {}) {
  const adaptationDecisions = buildFitnessAdaptationDecisions({
    progressSummary,
    profile,
    expertRules,
    knowledgeItems,
    checkInSignals
  });
  const planUpdateProposal = buildFitnessPlanUpdateProposal({
    adaptationDecisions,
    profile,
    expertRules,
    knowledgeItems
  });
  const professionalRecommendations = buildFitnessProfessionalRecommendations({
    progressSummary,
    adaptationDecisions,
    planUpdateProposal,
    profile
  });
  const weeklyCoachBrief = buildFitnessWeeklyCoachBrief({
    progressSummary,
    adaptationDecisions,
    planUpdateProposal,
    specialistContext,
    profile,
    expertRules,
    knowledgeItems
  });

  return {
    version: FITNESS_WEEKLY_REVIEW_VERSION,
    progressSummary: progressSummary || null,
    adaptationDecisions,
    planUpdateProposal,
    professionalRecommendations,
    weeklyCoachBrief
  };
}

module.exports = {
  FITNESS_WEEKLY_REVIEW_VERSION,
  buildFitnessWeeklyReview
};
