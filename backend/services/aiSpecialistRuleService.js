const { capabilityForRole } = require("../utils/aiSpecialistCapabilityRegistry");

const EMPTY_RULES = {
  hardStops: [],
  warnings: [],
  recommendedAdjustments: [],
  explanationHints: []
};

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function shortText(value, maximum = 120) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function stringList(value, maximum = 5) {
  return Array.isArray(value)
    ? value
        .map((item) => shortText(item, 80))
        .filter(Boolean)
        .slice(0, maximum)
    : [];
}

function uniqueRules(rules) {
  return [...new Set(rules.map((rule) => shortText(rule)).filter(Boolean))].slice(0, 6);
}

function buildRuleResult(ruleSetId, productRole, rules) {
  return {
    ruleSetId,
    productRole,
    hardStops: uniqueRules(rules.hardStops || []),
    warnings: uniqueRules(rules.warnings || []),
    recommendedAdjustments: uniqueRules(rules.recommendedAdjustments || []),
    explanationHints: uniqueRules(rules.explanationHints || [])
  };
}

function profileFromContext(context) {
  return plain(context)?.profile || {};
}

function buildStrengthTrainingRules(context = {}) {
  const profile = profileFromContext(context);
  const sessions = context.sessions || {};
  const issues = context.issues || {};
  const plan = context.currentPlan || {};
  const injuries = stringList(profile.injuries);
  const limitations = stringList(profile.limitations);
  const coachIntake =
    typeof profile.coachIntake === "object" && profile.coachIntake !== null
      ? profile.coachIntake
      : {};
  const warnings = [];
  const recommendedAdjustments = [];
  const explanationHints = [
    "Keep workout selection deterministic and inside the saved exercise library.",
    "Respect saved equipment, disliked exercises, injuries, and limitations.",
    "Use training preferences as emphasis changes, not as permission to remove required movement balance."
  ];

  if (injuries.length || limitations.length) {
    warnings.push(
      `Respect saved injury or limitation context: ${[...injuries, ...limitations].join(", ")}.`
    );
    recommendedAdjustments.push("Prefer lower-risk substitutions for painful or limited movement patterns.");
  }

  if (Number(sessions.recentCount) >= 3 && Number(sessions.completionRate) < 60) {
    warnings.push("Recent workout adherence is low.");
    recommendedAdjustments.push("Keep the plan simple and avoid adding extra volume until adherence improves.");
  }

  if (
    Number(sessions.recentCount) >= 2 &&
    Number.isFinite(Number(sessions.averageSetCompletionPercent)) &&
    Number(sessions.averageSetCompletionPercent) < 70
  ) {
    warnings.push("Recent set completion is low.");
    recommendedAdjustments.push("Use manageable sets and reps before progressing load or complexity.");
  }

  if (Number(issues.recentCount) > 0) {
    warnings.push(
      Array.isArray(issues.issueThemes) && issues.issueThemes.length
        ? `Recent workout issues were reported: ${issues.issueThemes.join(", ")}.`
        : "Recent workout issues were reported."
    );
    recommendedAdjustments.push("Avoid aggressive progression until reported issues are resolved.");
  }

  if (String(profile.level || "").toLowerCase() === "beginner") {
    recommendedAdjustments.push("Use controlled beginner volume and prioritize repeatable technique.");
  }

  if (coachIntake.trainingArchetype === "female_beginner_balanced_lower_body_bias") {
    recommendedAdjustments.push(
      "Use a balanced beginner foundation with modest lower-body and glute emphasis while maintaining upper-body stability work."
    );
    explanationHints.push(
      "Female beginner defaults may bias lower-body confidence and glute/leg development, but should not remove push, pull, or shoulder-health work."
    );
  }

  if (
    Array.isArray(coachIntake.avoidSpecialization) &&
    coachIntake.avoidSpecialization.includes("upper_body_width")
  ) {
    recommendedAdjustments.push(
      "Keep shoulder and back training at maintenance or stability volume unless the user requests upper-body hypertrophy."
    );
  }

  if (
    String(coachIntake.mainGoal || "").toLowerCase() === "hypertrophy" ||
    String(profile.goal || "").toLowerCase().includes("muscle")
  ) {
    explanationHints.push(
      "Hypertrophy work should be challenging and close to failure, with failure used selectively by exercise risk and recovery."
    );
  }

  if (Number(profile.trainingDaysPerWeek) > 5) {
    warnings.push("Training frequency is high for general plan generation.");
    recommendedAdjustments.push("Include recovery-friendly day structure and avoid max-effort work every day.");
  }

  if (
    Number(plan.assignmentCount) > 0 &&
    Number(plan.daysPerWeek) > 0 &&
    Number(plan.assignmentCount) / Number(plan.daysPerWeek) > 6
  ) {
    warnings.push("Current plan exercise density is high.");
    recommendedAdjustments.push("Keep daily exercise count controlled before adding more accessories.");
  }

  return buildRuleResult("strength_training", "fitness_coach", {
    hardStops: [],
    warnings,
    recommendedAdjustments,
    explanationHints
  });
}

function buildSportsNutritionRules(context = {}, options = {}) {
  const profile = profileFromContext(context);
  const recentLogging = context.recentLogging || {};
  const patterns = context.guidancePatterns || {};
  const allergies = stringList(profile.allergies);
  const medicalRestrictions = stringList(profile.medicalRestrictions);
  const warnings = [];
  const recommendedAdjustments = [];
  const explanationHints = [
    "Treat calories and protein as generated outputs anchored to backend validation.",
    "Keep guidance general and avoid medical diagnosis or treatment claims."
  ];
  const hardStops = [];

  if (allergies.length) {
    hardStops.push(`Do not recommend foods that match profile allergies: ${allergies.join(", ")}.`);
  }

  if (medicalRestrictions.length) {
    warnings.push(`Medical or dietary restrictions are present: ${medicalRestrictions.join(", ")}.`);
    recommendedAdjustments.push("Use conservative general guidance and avoid condition-specific medical advice.");
  }

  if (
    Number(recentLogging.loggedDayCount) >= 2 &&
    Number.isFinite(Number(recentLogging.averageProteinVsTargetPercent)) &&
    Number(recentLogging.averageProteinVsTargetPercent) < 80
  ) {
    warnings.push("Recent protein intake is below target.");
    recommendedAdjustments.push("Prioritize practical protein-forward meals and snacks.");
  }

  if (
    Number(recentLogging.loggedDayCount) >= 2 &&
    Number.isFinite(Number(recentLogging.averageCaloriesVsTargetPercent)) &&
    Number(recentLogging.averageCaloriesVsTargetPercent) > 110
  ) {
    warnings.push("Recent calorie intake is above target.");
    recommendedAdjustments.push("Favor portion control and lower calorie-density choices.");
  }

  if (Array.isArray(patterns.cautionFoods) && patterns.cautionFoods.length) {
    warnings.push(
      `Recent caution foods include: ${patterns.cautionFoods
        .map((item) => item.value)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ")}.`
    );
  }

  if (Number(patterns.lowConfidenceEstimateCount) > 0) {
    warnings.push("Some recent AI meal estimates had low confidence.");
    recommendedAdjustments.push("Ask for clearer portions or simpler meal descriptions when estimates are uncertain.");
  }

  if (options.baseline?.canCalculate === false) {
    hardStops.push("Do not generate calorie or protein targets until required profile fields are complete.");
  } else if (
    Number.isFinite(Number(options.baseline?.suggestedCalories)) &&
    Number.isFinite(Number(options.baseline?.suggestedProtein))
  ) {
    explanationHints.push("Keep any AI target personalization inside the validated backend target range.");
  }

  return buildRuleResult("sports_nutrition", "nutritionist", {
    hardStops,
    warnings,
    recommendedAdjustments,
    explanationHints
  });
}

const FUTURE_RULE_SKELETONS = {
  football_performance: {
    productRole: "football_coach",
    explanationHints: [
      "Future football plans should balance speed, agility, conditioning, power, and impact management."
    ],
    recommendedAdjustments: [
      "Use football-specific exposure only after sport-specific planning is enabled."
    ]
  },
  basketball_performance: {
    productRole: "basketball_coach",
    explanationHints: [
      "Future basketball plans should manage jump volume, landing mechanics, agility, and lower-body power."
    ],
    recommendedAdjustments: [
      "Use basketball-specific exposure only after sport-specific planning is enabled."
    ]
  },
  running_performance: {
    productRole: "running_coach",
    explanationHints: [
      "Future running plans should progress volume gradually and protect easy-session recovery."
    ],
    recommendedAdjustments: [
      "Use running-specific exposure only after sport-specific planning is enabled."
    ]
  },
  weight_loss_training: {
    productRole: "weight_loss_coach",
    explanationHints: [
      "Future weight-loss training should prioritize sustainable volume, adherence, and recovery."
    ],
    recommendedAdjustments: [
      "Use weight-loss-specific training only after that specialist is enabled."
    ]
  },
  general_fitness: {
    productRole: "general_fitness_coach",
    explanationHints: [
      "Future general fitness plans should balance movement patterns and habit-building."
    ],
    recommendedAdjustments: [
      "Use general fitness-specific planning only after that specialist is enabled."
    ]
  },
  diabetic_nutrition: {
    productRole: "diabetic_nutritionist",
    explanationHints: [
      "Future condition-aware nutrition must stay within medical-boundary rules and avoid treatment claims."
    ],
    recommendedAdjustments: [
      "Use condition-aware nutrition only after that specialist is enabled."
    ]
  }
};

function buildFutureRules(capability) {
  const skeleton = FUTURE_RULE_SKELETONS[capability.ruleSetId] || {};
  return buildRuleResult(capability.ruleSetId || "future_specialist", capability.productRole, {
    hardStops: ["This specialist is not available for plan generation yet."],
    warnings: ["Future specialist capability is registered but disabled."],
    recommendedAdjustments: skeleton.recommendedAdjustments || [],
    explanationHints: skeleton.explanationHints || capability.knowledgeTags || []
  });
}

function buildSpecialistRules({ specialist, specialistContext, baseline } = {}) {
  const plainSpecialist = plain(specialist) || {};
  const capability = capabilityForRole(plainSpecialist.domain, plainSpecialist.specialty);

  if (capability.ruleSetId === "strength_training") {
    return buildStrengthTrainingRules(specialistContext);
  }

  if (capability.ruleSetId === "sports_nutrition") {
    return buildSportsNutritionRules(specialistContext, { baseline });
  }

  return buildFutureRules(capability);
}

function attachRulesToContext(specialistContext, rules) {
  return {
    ...(plain(specialistContext) || {}),
    expertRules: rules || { ...EMPTY_RULES }
  };
}

module.exports = {
  attachRulesToContext,
  buildSpecialistRules,
  _internals: {
    buildFutureRules,
    buildSportsNutritionRules,
    buildStrengthTrainingRules
  }
};
