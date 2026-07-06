const CAPABILITY_STATUSES = {
  AVAILABLE: "available",
  COMING_SOON: "coming_soon"
};

const SPECIALIST_CAPABILITIES = [
  {
    domain: "training",
    specialty: "strength training",
    productRole: "fitness_coach",
    availabilityStatus: CAPABILITY_STATUSES.AVAILABLE,
    availabilityLabel: "Available Fitness Coach",
    availabilityDescription: "Selectable for workout planning.",
    isWorkoutAssignable: true,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "strength_training",
    knowledgeTags: ["strength", "hypertrophy", "progressive_overload", "recovery"]
  },
  {
    domain: "nutrition",
    specialty: "sports nutrition",
    productRole: "nutritionist",
    availabilityStatus: CAPABILITY_STATUSES.AVAILABLE,
    availabilityLabel: "Available Nutritionist",
    availabilityDescription: "Used for Nutrition and NutriScan guidance.",
    isWorkoutAssignable: false,
    isNutritionAvailable: true,
    plannerType: "nutrition_targets",
    contextType: "nutrition",
    ruleSetId: "sports_nutrition",
    knowledgeTags: ["protein_targets", "meal_timing", "recovery_nutrition"]
  },
  {
    domain: "training",
    specialty: "football",
    productRole: "football_coach",
    availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future football performance planning.",
    isWorkoutAssignable: false,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "football_performance",
    knowledgeTags: ["speed", "agility", "conditioning", "lower_body_power", "impact_management"]
  },
  {
    domain: "training",
    specialty: "basketball",
    productRole: "basketball_coach",
    availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future basketball performance planning.",
    isWorkoutAssignable: false,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "basketball_performance",
    knowledgeTags: ["jump_volume", "agility", "lower_body_power", "landing_mechanics"]
  },
  {
    domain: "training",
    specialty: "running",
    productRole: "running_coach",
    availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future running performance planning.",
    isWorkoutAssignable: false,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "running_performance",
    knowledgeTags: ["running_volume", "easy_runs", "conditioning", "fatigue_management"]
  },
  {
    domain: "training",
    specialty: "weight loss",
    productRole: "weight_loss_coach",
    availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future weight-loss training planning.",
    isWorkoutAssignable: false,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "weight_loss_training",
    knowledgeTags: ["sustainable_volume", "conditioning", "recovery", "adherence"]
  },
  {
    domain: "training",
    specialty: "general fitness",
    productRole: "general_fitness_coach",
    availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future general fitness planning.",
    isWorkoutAssignable: false,
    isNutritionAvailable: false,
    plannerType: "workout_plan",
    contextType: "fitness",
    ruleSetId: "general_fitness",
    knowledgeTags: ["movement_balance", "habit_building", "recovery"]
  },
  {
    domain: "nutrition",
    specialty: "diabetic nutrition",
    productRole: "diabetic_nutritionist",
    availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future condition-aware nutrition support.",
    isWorkoutAssignable: false,
    isNutritionAvailable: false,
    plannerType: "meal_plan",
    contextType: "nutrition",
    ruleSetId: "diabetic_nutrition",
    knowledgeTags: ["fiber", "added_sugar", "balanced_meals", "medical_boundary"]
  }
];

const DEFAULT_CAPABILITY = {
  availabilityStatus: CAPABILITY_STATUSES.COMING_SOON,
  availabilityLabel: "Coming soon",
  availabilityDescription: "Future development.",
  productRole: "future_specialist",
  isWorkoutAssignable: false,
  isNutritionAvailable: false,
  plannerType: "future",
  contextType: "none",
  ruleSetId: "future_specialist",
  knowledgeTags: []
};

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function capabilityKey(domain, specialty) {
  return `${normalized(domain)}:${normalized(specialty)}`;
}

const CAPABILITY_BY_ROLE = new Map(
  SPECIALIST_CAPABILITIES.map((capability) => [
    capabilityKey(capability.domain, capability.specialty),
    capability
  ])
);

function publicCapability(capability) {
  return {
    availabilityStatus: capability.availabilityStatus,
    availabilityLabel: capability.availabilityLabel,
    availabilityDescription: capability.availabilityDescription,
    productRole: capability.productRole,
    isWorkoutAssignable: capability.isWorkoutAssignable,
    isNutritionAvailable: capability.isNutritionAvailable,
    plannerType: capability.plannerType,
    contextType: capability.contextType,
    ruleSetId: capability.ruleSetId,
    knowledgeTags: capability.knowledgeTags
  };
}

function capabilityForRole(domain, specialty) {
  return CAPABILITY_BY_ROLE.get(capabilityKey(domain, specialty)) || DEFAULT_CAPABILITY;
}

function isCapabilityAvailable(capability) {
  return capability.availabilityStatus === CAPABILITY_STATUSES.AVAILABLE;
}

module.exports = {
  CAPABILITY_STATUSES,
  DEFAULT_CAPABILITY,
  SPECIALIST_CAPABILITIES,
  capabilityForRole,
  capabilityKey,
  isCapabilityAvailable,
  publicCapability
};
