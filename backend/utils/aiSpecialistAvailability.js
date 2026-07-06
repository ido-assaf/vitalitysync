const {
  SPECIALIST_CAPABILITIES,
  capabilityForRole,
  isCapabilityAvailable,
  publicCapability
} = require("./aiSpecialistCapabilityRegistry");

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

function capabilityForSpecialist(specialist) {
  const plain = plainSpecialist(specialist);
  return capabilityForRole(plain?.domain, plain?.specialty);
}

function isAvailableFitnessCoach(specialist) {
  const capability = capabilityForSpecialist(specialist);
  return (
    isActive(specialist) &&
    isCapabilityAvailable(capability) &&
    capability.isWorkoutAssignable === true &&
    matchesRole(specialist, AVAILABLE_FITNESS_COACH)
  );
}

function isAvailableNutritionist(specialist) {
  const capability = capabilityForSpecialist(specialist);
  return (
    isActive(specialist) &&
    isCapabilityAvailable(capability) &&
    capability.isNutritionAvailable === true &&
    matchesRole(specialist, AVAILABLE_NUTRITIONIST)
  );
}

function availabilityForSpecialist(specialist) {
  const capability = capabilityForSpecialist(specialist);
  const active = isActive(specialist);
  const availability = publicCapability(capability);

  return {
    ...availability,
    availabilityStatus: active ? availability.availabilityStatus : "coming_soon",
    availabilityLabel:
      active && isCapabilityAvailable(capability)
        ? availability.availabilityLabel
        : "Coming soon",
    isWorkoutAssignable: active ? availability.isWorkoutAssignable : false,
    isNutritionAvailable: active ? availability.isNutritionAvailable : false
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
  SPECIALIST_CAPABILITIES,
  availabilityForSpecialist,
  availableFitnessCoachWhere,
  availableNutritionistWhere,
  capabilityForSpecialist,
  decorateSpecialist,
  isAvailableFitnessCoach,
  isAvailableNutritionist
};
