const { buildBodyProgressSignal } = require("./aiSpecialistBodyProgressService");
const { buildLoadPrescriptionRecommendations } = require("./aiSpecialistLoadPrescriptionService");
const { buildSubstitutionRecommendations } = require("./aiSpecialistSubstitutionRecommendationService");
const { buildWeakMuscleRecommendation } = require("./aiSpecialistWeakMuscleRecommendationService");

const PROFESSIONAL_RECOMMENDATIONS_VERSION = "fitness_professional_recommendations_v0.1";

function buildFitnessProfessionalRecommendations({
  progressSummary,
  adaptationDecisions,
  planUpdateProposal,
  profile
} = {}) {
  const bodyProgress = buildBodyProgressSignal({ profile, progressSummary });

  return {
    version: PROFESSIONAL_RECOMMENDATIONS_VERSION,
    applyMode: "preview_only",
    loadPrescription: buildLoadPrescriptionRecommendations({
      progressSummary,
      adaptationDecisions,
      profile
    }),
    substitutionCandidates: buildSubstitutionRecommendations({
      adaptationDecisions,
      planUpdateProposal
    }),
    bodyProgress,
    weakMuscleFocus: buildWeakMuscleRecommendation({
      profile,
      progressSummary,
      adaptationDecisions,
      bodyProgress
    })
  };
}

module.exports = {
  PROFESSIONAL_RECOMMENDATIONS_VERSION,
  buildFitnessProfessionalRecommendations
};
