const FITNESS_PLANNING_MODIFIERS_VERSION = "fitness_planning_modifiers_v0.1";
const MAX_SOFT_SCORE_DELTA = 8;
const MAX_TOTAL_SCORE_DELTA = 12;

const EMPTY_FLAGS = {
  simplifyForAdherence: false,
  preferLowerRiskSubstitutions: false,
  biasLowerBodyButMaintainUpper: false,
  upperBodyMaintenance: false,
  beginnerTechniquePriority: false,
  hypertrophySelectiveFailureGuidance: false,
  avoidAggressiveProgression: false
};

const EMPTY_SCORE_BOOSTS = {
  glutes: 0,
  hamstrings: 0,
  quads: 0,
  hinge: 0,
  core: 0,
  stableLowerBody: 0,
  upperBodyMaintenance: 0
};

const EMPTY_SCORE_PENALTIES = {
  lunge: 0,
  quadDominant: 0,
  conditioning: 0,
  highRiskFailurePattern: 0,
  excessiveAccessories: 0
};

function emptyFitnessPlanningModifiers() {
  return {
    version: FITNESS_PLANNING_MODIFIERS_VERSION,
    flags: { ...EMPTY_FLAGS },
    scoreBoosts: { ...EMPTY_SCORE_BOOSTS },
    scorePenalties: { ...EMPTY_SCORE_PENALTIES },
    exerciseCountAdjustment: 0,
    prescriptionGuidance: [],
    scoreBounds: {
      maxSoftScoreDelta: MAX_SOFT_SCORE_DELTA,
      maxTotalScoreDelta: MAX_TOTAL_SCORE_DELTA
    }
  };
}

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function itemText(item) {
  return normalizedText([item?.id, item?.topic, item?.principle, item?.coachingUse].join(" "));
}

function hasKnowledge(knowledgeItems, matcher) {
  return Array.isArray(knowledgeItems) && knowledgeItems.some((item) => matcher(item, itemText(item)));
}

function clampSoftDelta(value) {
  const numeric = Number(value) || 0;

  return Math.max(-MAX_SOFT_SCORE_DELTA, Math.min(MAX_SOFT_SCORE_DELTA, numeric));
}

function profileContextText(specialistContext = {}, expertRules = {}) {
  const profile = specialistContext.profile || {};
  const coachIntake =
    typeof profile.coachIntake === "object" && profile.coachIntake !== null
      ? profile.coachIntake
      : {};

  return normalizedText(
    [
      profile.goal,
      profile.level,
      profile.biologicalSex,
      ...(Array.isArray(profile.injuries) ? profile.injuries : []),
      ...(Array.isArray(profile.limitations) ? profile.limitations : []),
      coachIntake.mainGoal,
      coachIntake.trainingArchetype,
      ...(Array.isArray(coachIntake.priorityMuscleGroups) ? coachIntake.priorityMuscleGroups : []),
      ...(Array.isArray(coachIntake.maintenanceMuscleGroups)
        ? coachIntake.maintenanceMuscleGroups
        : []),
      ...(Array.isArray(coachIntake.avoidSpecialization) ? coachIntake.avoidSpecialization : []),
      ...(Array.isArray(coachIntake.constraints) ? coachIntake.constraints : []),
      ...(Array.isArray(expertRules.warnings) ? expertRules.warnings : []),
      ...(Array.isArray(expertRules.recommendedAdjustments)
        ? expertRules.recommendedAdjustments
        : []),
      ...(Array.isArray(expertRules.explanationHints) ? expertRules.explanationHints : [])
    ].join(" ")
  );
}

function buildFitnessPlanningModifiers({ specialistContext, expertRules, knowledgeItems } = {}) {
  const modifiers = emptyFitnessPlanningModifiers();
  const contextText = profileContextText(specialistContext, expertRules);
  const hasAnyKnowledge = Array.isArray(knowledgeItems) && knowledgeItems.length > 0;

  if (!hasAnyKnowledge) {
    return modifiers;
  }

  const isAdvancedBodybuilding =
    contextText.includes("advanced") &&
    (contextText.includes("bodybuilding") || contextText.includes("advanced_bodybuilding_split"));
  const hasUpperBodyPriority = contextText.includes("upper_body") && !contextText.includes("upper_body_width");

  const femaleBeginnerLowerBody = hasKnowledge(
    knowledgeItems,
    (item) => item.id === "fit_kb_025_female_beginner_lower_body_bias"
  );
  const upperBodyMaintenance = hasKnowledge(
    knowledgeItems,
    (item) => item.id === "fit_kb_026_upper_body_maintenance"
  );

  if (femaleBeginnerLowerBody && !isAdvancedBodybuilding && !hasUpperBodyPriority) {
    modifiers.flags.biasLowerBodyButMaintainUpper = true;
    modifiers.flags.beginnerTechniquePriority = true;
    modifiers.scoreBoosts.glutes = clampSoftDelta(6);
    modifiers.scoreBoosts.hamstrings = clampSoftDelta(5);
    modifiers.scoreBoosts.quads = clampSoftDelta(3);
    modifiers.scoreBoosts.hinge = clampSoftDelta(5);
    modifiers.scoreBoosts.core = clampSoftDelta(3);
  }

  if (upperBodyMaintenance && !isAdvancedBodybuilding) {
    modifiers.flags.upperBodyMaintenance = true;
    modifiers.scoreBoosts.upperBodyMaintenance = clampSoftDelta(4);
  }

  if (
    hasKnowledge(
      knowledgeItems,
      (item) =>
        item.id === "fit_kb_020_lower_risk_substitutions" ||
        item.id === "fit_kb_028_pain_reduce_aggression" ||
        itemText(item).includes("knee")
    )
  ) {
    modifiers.flags.preferLowerRiskSubstitutions = true;
    modifiers.flags.avoidAggressiveProgression = true;
    modifiers.scoreBoosts.hinge = Math.max(modifiers.scoreBoosts.hinge, clampSoftDelta(6));
    modifiers.scoreBoosts.glutes = Math.max(modifiers.scoreBoosts.glutes, clampSoftDelta(5));
    modifiers.scoreBoosts.core = Math.max(modifiers.scoreBoosts.core, clampSoftDelta(3));
    modifiers.scoreBoosts.stableLowerBody = clampSoftDelta(6);
    modifiers.scorePenalties.lunge = clampSoftDelta(-6);
    modifiers.scorePenalties.quadDominant = clampSoftDelta(-5);
    modifiers.scorePenalties.conditioning = clampSoftDelta(-5);
    modifiers.scorePenalties.highRiskFailurePattern = clampSoftDelta(-4);
  }

  if (
    hasKnowledge(
      knowledgeItems,
      (item) =>
        item.id === "fit_kb_030_adherence_simplify" ||
        item.id === "fit_kb_016_progress_after_completion" ||
        item.id === "fit_kb_009_beginner_controlled_volume"
    )
  ) {
    modifiers.flags.simplifyForAdherence = true;
    modifiers.flags.avoidAggressiveProgression = true;
    modifiers.exerciseCountAdjustment = -1;
    modifiers.scorePenalties.excessiveAccessories = clampSoftDelta(-4);
  }

  if (
    hasKnowledge(
      knowledgeItems,
      (item, text) =>
        item.id === "fit_kb_001_hypertrophy_close_to_failure" ||
        item.id === "fit_kb_002_failure_selective_allowed" ||
        text.includes("failure")
    )
  ) {
    modifiers.flags.hypertrophySelectiveFailureGuidance = true;
    modifiers.prescriptionGuidance.push(
      "Close-to-failure matters for hypertrophy; failure is useful and allowed but should be selective."
    );
  }

  if (modifiers.flags.avoidAggressiveProgression) {
    modifiers.prescriptionGuidance.push("Progress after completion and keep painful patterns conservative.");
  }

  return modifiers;
}

function boundedScoreDelta(value) {
  return Math.max(-MAX_TOTAL_SCORE_DELTA, Math.min(MAX_TOTAL_SCORE_DELTA, Number(value) || 0));
}

module.exports = {
  FITNESS_PLANNING_MODIFIERS_VERSION,
  MAX_SOFT_SCORE_DELTA,
  MAX_TOTAL_SCORE_DELTA,
  boundedScoreDelta,
  buildFitnessPlanningModifiers,
  emptyFitnessPlanningModifiers
};
