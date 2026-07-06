const {
  FITNESS_KNOWLEDGE_ITEMS
} = require("./aiSpecialistKnowledgeBase");

const MAX_LIMIT = 6;
const DEFAULT_LIMIT = 6;

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function list(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizedText(item)).filter(Boolean)
    : [];
}

function addIf(tags, condition, tag) {
  if (condition) {
    tags.add(tag);
  }
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function buildContextTags({ specialistContext, expertRules } = {}) {
  const context = plain(specialistContext) || {};
  const profile = plain(context.profile) || {};
  const coachIntake =
    typeof profile.coachIntake === "object" && profile.coachIntake !== null
      ? profile.coachIntake
      : {};
  const sessions = plain(context.sessions) || {};
  const issues = plain(context.issues) || {};
  const currentPlan = plain(context.currentPlan) || {};
  const rules = plain(expertRules) || {};
  const tags = new Set(["fitness", "workout_plan"]);

  const goalText = normalizedText([profile.goal, coachIntake.mainGoal, currentPlan.goal].join(" "));
  const level = normalizedText(profile.level || coachIntake.experience || currentPlan.level);
  const sex = normalizedText(profile.biologicalSex);
  const trainingArchetype = normalizedText(coachIntake.trainingArchetype);
  const lifeStage = normalizedText(coachIntake.lifeStage);
  const priorityMuscles = list(coachIntake.priorityMuscleGroups);
  const maintenanceMuscles = list(coachIntake.maintenanceMuscleGroups);
  const avoidSpecialization = list(coachIntake.avoidSpecialization);
  const constraints = list(coachIntake.constraints);
  const issueThemes = list(issues.issueThemes);
  const injuryText = normalizedText(
    [...list(profile.injuries), ...list(profile.limitations), ...issueThemes, ...constraints].join(" ")
  );
  const ruleText = normalizedText(
    [
      ...(Array.isArray(rules.warnings) ? rules.warnings : []),
      ...(Array.isArray(rules.recommendedAdjustments) ? rules.recommendedAdjustments : []),
      ...(Array.isArray(rules.explanationHints) ? rules.explanationHints : [])
    ].join(" ")
  );
  const allText = normalizedText(
    [
      goalText,
      level,
      sex,
      lifeStage,
      trainingArchetype,
      priorityMuscles.join(" "),
      maintenanceMuscles.join(" "),
      avoidSpecialization.join(" "),
      constraints.join(" "),
      injuryText,
      ruleText
    ].join(" ")
  );

  addIf(tags, hasAny(goalText, ["muscle", "hypertrophy", "gain", "tone"]), "hypertrophy");
  addIf(tags, hasAny(goalText, ["muscle", "gain"]), "muscle_gain");
  addIf(tags, hasAny(goalText, ["strength", "powerlift", "stronger"]), "strength");
  addIf(tags, hasAny(goalText, ["bodybuild", "physique", "stage"]), "bodybuilding");
  addIf(tags, hasAny(goalText, ["fat loss", "weight loss", "lose fat", "lean"]), "fat_loss");
  addIf(tags, hasAny(goalText, ["health", "general", "fitness"]), "general_fitness");

  addIf(tags, level === "beginner", "beginner");
  addIf(tags, level === "intermediate", "intermediate");
  addIf(tags, level === "advanced" || level === "expert", "advanced");
  addIf(tags, sex === "female", "female");
  addIf(tags, sex === "male", "male");

  if (trainingArchetype) {
    tags.add(trainingArchetype);
  }
  addIf(
    tags,
    trainingArchetype === "female_beginner_balanced_lower_body_bias",
    "female_beginner_lower_body_bias"
  );
  addIf(tags, priorityMuscles.some((item) => item.includes("glute")), "glutes");
  addIf(
    tags,
    priorityMuscles.some((item) =>
      ["glute", "hamstring", "quad", "leg", "lower"].some((term) => item.includes(term))
    ),
    "lower_body_bias"
  );
  addIf(tags, priorityMuscles.some((item) => item.includes("upper")), "upper_body_priority");
  addIf(
    tags,
    maintenanceMuscles.some((item) =>
      ["shoulder", "back", "chest", "upper"].some((term) => item.includes(term))
    ),
    "upper_body_maintenance"
  );
  addIf(tags, avoidSpecialization.some((item) => item.includes("upper_body_width")), "avoid_upper_body_width");
  addIf(tags, constraints.some((item) => item.includes("confidence")), "confidence_building");
  addIf(tags, list(profile.equipmentAccess).length > 0, "equipment");
  addIf(tags, Number(sessions.recentCount || 0) === 0, "no_history");

  const completionRate = Number(sessions.completionRate);
  const setCompletion = Number(sessions.averageSetCompletionPercent);
  addIf(tags, Number(sessions.recentCount) >= 3 && completionRate < 60, "low_adherence");
  addIf(
    tags,
    Number.isFinite(setCompletion) && Number(sessions.recentCount) >= 2 && setCompletion < 70,
    "low_completion"
  );
  addIf(tags, hasAny(ruleText, ["adherence is low", "keep the plan simple"]), "low_adherence");
  addIf(tags, hasAny(ruleText, ["set completion is low", "manageable sets"]), "low_completion");
  addIf(tags, hasAny(ruleText, ["recovery", "aggressive progression", "high for general"]), "recovery");
  addIf(tags, hasAny(ruleText, ["deload", "easier week"]), "deload");

  addIf(tags, hasAny(injuryText, ["injury", "limitation", "pain", "discomfort"]), "injury_limitation");
  addIf(tags, hasAny(injuryText, ["pain", "discomfort", "ache", "sore"]), "pain");
  addIf(tags, hasAny(injuryText, ["knee", "lunge", "patella"]), "knee_pain");
  addIf(tags, hasAny(injuryText, ["sharp pain", "acute pain"]), "acute_pain");
  addIf(tags, hasAny(ruleText, ["pain", "injury", "issue", "lower-risk"]), "pain");

  addIf(tags, hasAny(allText, ["pregnant", "pregnancy"]), "pregnancy");
  addIf(tags, hasAny(allText, ["postpartum", "after birth", "after delivery"]), "postpartum");
  addIf(
    tags,
    hasAny(allText, ["supplement", "creatine", "caffeine", "pre-workout", "performance supplement"]),
    "supplement_context"
  );

  return tags;
}

function isExplicitlyGatedOut(item, contextTags) {
  const itemTags = new Set([...(item.tags || []), ...(item.appliesTo || [])]);

  if (itemTags.has("pregnancy") && !contextTags.has("pregnancy")) {
    return true;
  }
  if (itemTags.has("postpartum") && !contextTags.has("postpartum")) {
    return true;
  }
  if (itemTags.has("supplement") && !contextTags.has("supplement_context")) {
    return true;
  }
  if (itemTags.has("supplement_context") && !contextTags.has("supplement_context")) {
    return true;
  }

  return false;
}

function scoreItem(item, contextTags) {
  if (isExplicitlyGatedOut(item, contextTags)) {
    return 0;
  }

  if ((item.avoidWhen || []).some((tag) => contextTags.has(tag))) {
    return 0;
  }

  let score = 0;

  (item.appliesTo || []).forEach((tag) => {
    if (contextTags.has(tag)) {
      score += 4;
    }
  });
  (item.tags || []).forEach((tag) => {
    if (contextTags.has(tag)) {
      score += 1;
    }
  });

  if (contextTags.has("hypertrophy") && (item.tags || []).includes("rir")) {
    score += 2;
  }
  if (contextTags.has("pain") && (item.tags || []).includes("substitution")) {
    score += 3;
  }
  if (contextTags.has("low_adherence") && (item.tags || []).includes("simplicity")) {
    score += 3;
  }
  if (
    contextTags.has("female_beginner_lower_body_bias") &&
    (item.tags || []).includes("female_beginner")
  ) {
    score += 3;
  }
  if (contextTags.has("pregnancy") && (item.tags || []).includes("pregnancy")) {
    score += 20;
  }
  if (contextTags.has("postpartum") && (item.tags || []).includes("postpartum")) {
    score += 20;
  }
  if (contextTags.has("supplement_context") && (item.tags || []).includes("supplement")) {
    score += 20;
  }

  return score;
}

function compactKnowledgeItem(item) {
  return {
    id: item.id,
    topic: item.topic,
    principle: item.principle,
    coachingUse: item.coachingUse,
    confidence: item.confidence,
    sourceLabel: item.sourceLabel
  };
}

function priorityKnowledgeIds(contextTags) {
  const ids = [];

  if (contextTags.has("female_beginner_lower_body_bias")) {
    ids.push("fit_kb_025_female_beginner_lower_body_bias");
  }
  if (contextTags.has("upper_body_maintenance")) {
    ids.push("fit_kb_026_upper_body_maintenance");
  }
  if (contextTags.has("pain") || contextTags.has("knee_pain")) {
    ids.push("fit_kb_020_lower_risk_substitutions");
  }
  if (contextTags.has("low_adherence") || contextTags.has("low_completion")) {
    ids.push("fit_kb_030_adherence_simplify");
  }

  return ids;
}

function applyPriorityKnowledge(rankedEntries, contextTags, cappedLimit) {
  const priorityIds = priorityKnowledgeIds(contextTags);
  const selected = rankedEntries.slice(0, cappedLimit);
  const selectedIds = new Set(selected.map((entry) => entry.item.id));

  priorityIds.forEach((id) => {
    if (selectedIds.has(id)) {
      return;
    }

    const priorityEntry = rankedEntries.find((entry) => entry.item.id === id);
    if (!priorityEntry) {
      return;
    }

    if (selected.length < cappedLimit) {
      selected.push(priorityEntry);
      selectedIds.add(id);
      return;
    }

    const replaceIndex = selected.reduceRight((foundIndex, entry, index) => {
      if (foundIndex !== -1) return foundIndex;
      return priorityIds.includes(entry.item.id) ? -1 : index;
    }, -1);
    const finalReplaceIndex = replaceIndex === -1 ? selected.length - 1 : replaceIndex;

    selectedIds.delete(selected[finalReplaceIndex].item.id);
    selected[finalReplaceIndex] = priorityEntry;
    selectedIds.add(id);
  });

  return selected.sort((left, right) => right.score - left.score || left.index - right.index);
}

function retrieveFitnessKnowledge({ specialistContext, expertRules, limit = DEFAULT_LIMIT } = {}) {
  const cappedLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT));
  const contextTags = buildContextTags({ specialistContext, expertRules });

  const rankedEntries = FITNESS_KNOWLEDGE_ITEMS.map((item, index) => ({
    item,
    index,
    score: scoreItem(item, contextTags)
  }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return applyPriorityKnowledge(rankedEntries, contextTags, cappedLimit).map((entry) =>
    compactKnowledgeItem(entry.item)
  );
}

module.exports = {
  retrieveFitnessKnowledge,
  _internals: {
    buildContextTags,
    priorityKnowledgeIds,
    scoreItem
  }
};
