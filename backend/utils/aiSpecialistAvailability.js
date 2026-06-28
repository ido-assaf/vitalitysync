const AVAILABLE_FITNESS_COACH = {
  domain: "training",
  specialty: "strength training"
};

const AVAILABLE_NUTRITIONIST = {
  domain: "nutrition",
  specialty: "sports nutrition"
};

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function plainSpecialist(specialist) {
  return specialist && typeof specialist.toJSON === "function"
    ? specialist.toJSON()
    : specialist;
}

function isActive(specialist) {
  return plainSpecialist(specialist)?.isActive !== false;
}

function matchesRole(specialist, role) {
  const plain = plainSpecialist(specialist);
  return (
    normalized(plain?.domain) === role.domain &&
    normalized(plain?.specialty) === role.specialty
  );
}

function isAvailableFitnessCoach(specialist) {
  return isActive(specialist) && matchesRole(specialist, AVAILABLE_FITNESS_COACH);
}

function isAvailableNutritionist(specialist) {
  return isActive(specialist) && matchesRole(specialist, AVAILABLE_NUTRITIONIST);
}

function availabilityForSpecialist(specialist) {
  if (isAvailableFitnessCoach(specialist)) {
    return {
      availabilityStatus: "available",
      availabilityLabel: "Available Fitness Coach",
      availabilityDescription: "Selectable for workout planning.",
      productRole: "fitness_coach",
      isWorkoutAssignable: true,
      isNutritionAvailable: false
    };
  }

  if (isAvailableNutritionist(specialist)) {
    return {
      availabilityStatus: "available",
      availabilityLabel: "Available Nutritionist",
      availabilityDescription: "Used for Nutrition and NutriScan guidance.",
      productRole: "nutritionist",
      isWorkoutAssignable: false,
      isNutritionAvailable: true
    };
  }

  return {
    availabilityStatus: "coming_soon",
    availabilityLabel: "Coming soon",
    availabilityDescription: "Future development.",
    productRole: "future_specialist",
    isWorkoutAssignable: false,
    isNutritionAvailable: false
  };
}

function decorateSpecialist(specialist) {
  const plain = plainSpecialist(specialist);
  return {
    ...plain,
    ...availabilityForSpecialist(plain)
  };
}

function availableFitnessCoachWhere(extraWhere = {}) {
  return {
    ...extraWhere,
    domain: AVAILABLE_FITNESS_COACH.domain,
    specialty: AVAILABLE_FITNESS_COACH.specialty,
    isActive: true
  };
}

function availableNutritionistWhere(extraWhere = {}) {
  return {
    ...extraWhere,
    domain: AVAILABLE_NUTRITIONIST.domain,
    specialty: AVAILABLE_NUTRITIONIST.specialty,
    isActive: true
  };
}

module.exports = {
  AVAILABLE_FITNESS_COACH,
  AVAILABLE_NUTRITIONIST,
  availabilityForSpecialist,
  availableFitnessCoachWhere,
  availableNutritionistWhere,
  decorateSpecialist,
  isAvailableFitnessCoach,
  isAvailableNutritionist
};
