const TEXT_LIMIT = 220;
const LIST_LIMIT = 6;

function shortText(value, maximum = TEXT_LIMIT) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function textList(value, maximum = LIST_LIMIT) {
  if (Array.isArray(value)) {
    return value
      .map((item) => shortText(item, 80))
      .filter(Boolean)
      .slice(0, maximum);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => shortText(item, 80))
      .filter(Boolean)
      .slice(0, maximum);
  }

  return [];
}

function normalizedText(value) {
  return shortText(value, 800).toLowerCase();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function uniqueList(values, maximum = LIST_LIMIT) {
  return [...new Set(values.map((value) => shortText(value, 80)).filter(Boolean))].slice(
    0,
    maximum
  );
}

function compactList(values) {
  return Array.isArray(values) ? values.filter(Boolean).slice(0, LIST_LIMIT) : [];
}

function sourceIntake(body = {}) {
  const preferences =
    typeof body.specialtyPreferences === "object" && body.specialtyPreferences !== null
      ? body.specialtyPreferences
      : {};
  const nested =
    typeof preferences.coachIntake === "object" && preferences.coachIntake !== null
      ? preferences.coachIntake
      : {};
  const direct =
    typeof body.coachIntake === "object" && body.coachIntake !== null ? body.coachIntake : {};

  return {
    ...nested,
    ...direct
  };
}

function normalizeGoal(body = {}, intake = {}) {
  const rawGoal = normalizedText(intake.mainGoal || body.goal);
  const combined = normalizedText(
    [
      rawGoal,
      intake.desiredOutcome,
      intake.whatMattersMost,
      intake.concerns,
      body.freeTextNotes,
      body.preferredStyle
    ].join(" ")
  );

  if (hasAny(combined, ["bodybuild", "physique competition", "stage"])) {
    return "bodybuilding";
  }

  if (hasAny(combined, ["powerlift", "max strength", "stronger", "strength"])) {
    return "strength";
  }

  if (hasAny(combined, ["build muscle", "muscle gain", "hypertrophy", "tone", "toned"])) {
    return "hypertrophy";
  }

  if (hasAny(combined, ["lose fat", "fat loss", "weight loss", "lean", "cut"])) {
    return "fat_loss";
  }

  if (hasAny(combined, ["sport", "football", "basketball", "running", "athletic"])) {
    return "athletic_performance";
  }

  return rawGoal || "general_fitness";
}

function normalizeExperience(body = {}, intake = {}) {
  const value = normalizedText(intake.experience || body.level);

  if (hasAny(value, ["advanced", "expert", "bodybuilder", "powerlifter"])) return "advanced";
  if (hasAny(value, ["intermediate", "some experience", "experienced"])) return "intermediate";
  if (hasAny(value, ["beginner", "new", "start", "first"])) return "beginner";

  return "beginner";
}

function inferPreferences(body = {}, intake = {}) {
  const text = normalizedText(
    [
      intake.desiredOutcome,
      intake.whatMattersMost,
      intake.concerns,
      intake.specificLook,
      body.freeTextNotes,
      body.preferredStyle,
      body.goal
    ].join(" ")
  );
  const priorityMuscleGroups = [];
  const maintenanceMuscleGroups = [];
  const avoidSpecialization = [];
  const constraints = [];

  if (hasAny(text, ["glute", "booty", "butt", "lower body", "legs", "leg"])) {
    priorityMuscleGroups.push("glutes", "hamstrings", "quads");
  }

  if (hasAny(text, ["core", "abs", "posture"])) {
    priorityMuscleGroups.push("core");
  }

  if (hasAny(text, ["chest", "back", "shoulder", "arms", "upper body"])) {
    priorityMuscleGroups.push("upper_body");
  }

  if (
    hasAny(text, [
      "bulky",
      "too big",
      "wide",
      "broader",
      "broad shoulders",
      "wide back",
      "lat width",
      "traps"
    ])
  ) {
    avoidSpecialization.push("upper_body_width", "lat_width", "trap_growth");
    maintenanceMuscleGroups.push("shoulders", "back", "chest");
  }

  if (hasAny(text, ["gym anxiety", "confidence", "not know technique", "scared", "afraid"])) {
    constraints.push("confidence_building");
  }

  if (hasAny(text, ["short", "busy", "time", "quick"])) {
    constraints.push("time_limited");
  }

  return {
    priorityMuscleGroups: uniqueList(priorityMuscleGroups),
    maintenanceMuscleGroups: uniqueList(maintenanceMuscleGroups),
    avoidSpecialization: uniqueList(avoidSpecialization),
    constraints: uniqueList(constraints)
  };
}

function normalizeLifeStage(intake = {}) {
  const raw = normalizedText(
    [intake.lifeStage, intake.sexContext, intake.concerns, intake.healthContext].join(" ")
  );

  if (hasAny(raw, ["pregnant", "pregnancy"])) return "pregnancy";
  if (hasAny(raw, ["postpartum", "after birth", "after delivery"])) return "postpartum";
  if (hasAny(raw, ["menopause", "perimenopause"])) return "menopause";
  if (hasAny(raw, ["cycle", "period", "menstrual"])) return "menstrual_symptoms_relevant";

  return null;
}

function resolveTrainingArchetype({ biologicalSex, goal, experience, preferences, lifeStage }) {
  const sex = normalizedText(biologicalSex);

  if (lifeStage === "pregnancy") return "pregnancy_strength_safety";
  if (lifeStage === "postpartum") return "postpartum_return_to_training";
  if (goal === "bodybuilding" && experience !== "beginner") return "advanced_bodybuilding_split";
  if (goal === "strength") return `strength_focused_${experience}`;
  if (goal === "athletic_performance") return "sport_performance_foundation";
  if (goal === "fat_loss") return "general_beginner_weight_loss_foundation";

  if (
    sex === "female" &&
    experience === "beginner" &&
    !compactList(preferences.priorityMuscleGroups).includes("upper_body")
  ) {
    return "female_beginner_balanced_lower_body_bias";
  }

  if (sex === "male" && experience === "beginner") {
    return "male_beginner_balanced_strength_foundation";
  }

  if (goal === "hypertrophy") return `intermediate_hypertrophy_balanced`;

  return `${experience}_balanced_foundation`;
}

function coachingToneFor(intake = {}, preferences = {}) {
  const text = normalizedText(
    [intake.concerns, intake.whatMattersMost, intake.desiredOutcome].join(" ")
  );

  if (
    compactList(preferences.constraints).includes("confidence_building") ||
    hasAny(text, ["confidence", "anxious", "scared", "beginner"])
  ) {
    return "supportive_beginner";
  }

  if (hasAny(text, ["push me", "serious", "advanced", "discipline"])) {
    return "direct_performance";
  }

  return "professional_supportive";
}

function normalizeCoachIntake(body = {}) {
  const intake = sourceIntake(body);
  const goal = normalizeGoal(body, intake);
  const experience = normalizeExperience(body, intake);
  const preferences = inferPreferences(body, intake);
  const lifeStage = normalizeLifeStage(intake);
  const trainingArchetype =
    shortText(intake.trainingArchetype, 80) ||
    resolveTrainingArchetype({
      biologicalSex: body.biologicalSex,
      goal,
      experience,
      preferences,
      lifeStage
    });
  const constraints = uniqueList([
    ...preferences.constraints,
    ...textList(body.injuries).map((item) => `injury:${item}`),
    ...textList(body.limitations).map((item) => `limitation:${item}`),
    Number.isInteger(body.trainingDaysPerWeek) ? `${body.trainingDaysPerWeek}_days_per_week` : ""
  ]);

  return {
    version: "coach_intake_v1",
    mainGoal: goal,
    experience,
    desiredOutcome: shortText(intake.desiredOutcome || intake.goalDescription || ""),
    whatMattersMost: shortText(intake.whatMattersMost || intake.priorities || ""),
    concerns: shortText(intake.concerns || ""),
    trainingPlace: shortText(intake.trainingPlace || ""),
    weeklyAvailability: Number.isInteger(body.trainingDaysPerWeek)
      ? body.trainingDaysPerWeek
      : intake.weeklyAvailability || null,
    lifeStage,
    trainingArchetype,
    priorityMuscleGroups:
      textList(intake.priorityMuscleGroups).length > 0
        ? textList(intake.priorityMuscleGroups)
        : preferences.priorityMuscleGroups.length > 0
          ? preferences.priorityMuscleGroups
          : trainingArchetype === "female_beginner_balanced_lower_body_bias"
            ? ["glutes", "hamstrings", "quads", "core"]
            : [],
    maintenanceMuscleGroups:
      textList(intake.maintenanceMuscleGroups).length > 0
        ? textList(intake.maintenanceMuscleGroups)
        : preferences.maintenanceMuscleGroups.length > 0
          ? preferences.maintenanceMuscleGroups
          : trainingArchetype === "female_beginner_balanced_lower_body_bias"
            ? ["shoulders", "back", "chest"]
            : [],
    avoidSpecialization:
      textList(intake.avoidSpecialization).length > 0
        ? textList(intake.avoidSpecialization)
        : preferences.avoidSpecialization,
    constraints,
    coachingTone: coachingToneFor(intake, { ...preferences, constraints }),
    confidence:
      intake.desiredOutcome || intake.whatMattersMost || intake.concerns || body.freeTextNotes
        ? "medium"
        : "low"
  };
}

function summarizeCoachIntake(value) {
  const intake = value?.version === "coach_intake_v1" ? value : normalizeCoachIntake(value || {});

  return {
    trainingArchetype: intake.trainingArchetype,
    mainGoal: intake.mainGoal,
    experience: intake.experience,
    priorityMuscleGroups: compactList(intake.priorityMuscleGroups),
    maintenanceMuscleGroups: compactList(intake.maintenanceMuscleGroups),
    avoidSpecialization: compactList(intake.avoidSpecialization),
    constraints: compactList(intake.constraints),
    coachingTone: intake.coachingTone,
    confidence: intake.confidence
  };
}

module.exports = {
  normalizeCoachIntake,
  resolveTrainingArchetype,
  summarizeCoachIntake,
  _internals: {
    inferPreferences,
    normalizeExperience,
    normalizeGoal
  }
};
