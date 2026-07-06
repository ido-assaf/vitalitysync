const { Exercise, TraineeProfile, WorkoutPlanExercise, WorkoutSession } = require("../models");
const {
  EXERCISE_LIBRARY_SOURCE,
  isExerciseAllowed,
  isStableLowerBodyExercise,
  normalizeList
} = require("./exerciseSelectionService");
const {
  FITNESS_KNOWLEDGE_ITEMS,
  PROFESSIONAL_RULES,
  PROFESSIONAL_SOURCE_ITEMS
} = require("./aiSpecialistKnowledgeBase");

// Deterministic, evidence-cited builder for the AI Specialist's automatic in-session
// response to a live-workout issue. No LLM: every response is a fixed template filled from
// the trainee's own data, and every recommendation resolves to real evidence-base ids.

// Safety-first ordering: the single top signal is the one auto-sent.
const SIGNAL_PRIORITY = ["pain_signal", "fatigue_signal", "equipment_unavailable", "too_hard", "too_easy"];

const RESPONSE_CONFIG = {
  pain_signal: {
    responseType: "safety_substitution",
    needsSubstitute: true,
    citationIds: [
      "fit_kb_020_lower_risk_substitutions",
      "fit_kb_028_pain_reduce_aggression",
      "rule_substitution_pain_lower_risk",
      "rule_pause_progression_on_pain"
    ]
  },
  fatigue_signal: {
    responseType: "reduce_volume",
    needsSubstitute: false,
    citationIds: [
      "fit_kb_017_deload_when_needed",
      "fit_kb_010_volume_recovery_check",
      "rule_reduce_on_recovery_risk"
    ]
  },
  equipment_unavailable: {
    responseType: "equipment_substitution",
    needsSubstitute: true,
    citationIds: ["fit_kb_021_equipment_matched_selection", "rule_substitution_same_training_intent"]
  },
  too_hard: {
    responseType: "reduce_load",
    needsSubstitute: false,
    citationIds: [
      "fit_kb_016_progress_after_completion",
      "fit_kb_004_high_risk_failure_limit",
      "fit_kb_017_deload_when_needed"
    ]
  },
  too_easy: {
    responseType: "progress_load",
    needsSubstitute: false,
    citationIds: ["fit_kb_015_progressive_overload_small_steps", "rule_load_cautious_progression"]
  }
};

const BODY_PART_KEYWORDS = {
  knee: ["knee", "patella", "ברך"],
  shoulder: ["shoulder", "כתף"],
  back: ["back", "spine", "גב"],
  hip: ["hip", "ירך"],
  elbow: ["elbow", "מרפק"],
  wrist: ["wrist"],
  ankle: ["ankle", "קרסול"]
};

const BODY_PART_REGION = { knee: "legs", hip: "legs", shoulder: "shoulders", back: "back" };

const UNAVAILABLE_EQUIPMENT_KEYWORDS = {
  barbell: ["barbell", "rack", "squat rack", "power rack"],
  machine: ["machine"],
  cable: ["cable"],
  dumbbell: ["dumbbell"]
};

const KB_BY_ID = new Map(FITNESS_KNOWLEDGE_ITEMS.map((item) => [item.id, item]));
const RULE_BY_ID = new Map(PROFESSIONAL_RULES.map((rule) => [rule.id, rule]));
const SOURCE_BY_ID = new Map(PROFESSIONAL_SOURCE_ITEMS.map((source) => [source.id, source]));

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function resolveCitation(id) {
  const kb = KB_BY_ID.get(id);
  if (kb) {
    return {
      id,
      sourceLabel: kb.sourceLabel || null,
      evidenceLevel: kb.evidenceLevel || null,
      url: kb.sourceUrl || null,
      rationale: kb.coachingUse || kb.principle || ""
    };
  }

  const rule = RULE_BY_ID.get(id);
  if (rule) {
    const source = SOURCE_BY_ID.get((rule.sourceItemIds || [])[0]);
    return {
      id,
      sourceLabel: source?.label || null,
      evidenceLevel: rule.evidenceLevel || null,
      url: source?.url || null,
      rationale: rule.evidenceSummary || ""
    };
  }

  return null;
}

function detectBodyPart(message) {
  const msg = lower(message);
  return (
    Object.keys(BODY_PART_KEYWORDS).find((part) =>
      BODY_PART_KEYWORDS[part].some((keyword) => msg.includes(keyword))
    ) || null
  );
}

function detectUnavailableEquipment(message) {
  const msg = lower(message);
  return (
    Object.keys(UNAVAILABLE_EQUIPMENT_KEYWORDS).find((equipment) =>
      UNAVAILABLE_EQUIPMENT_KEYWORDS[equipment].some((keyword) => msg.includes(keyword))
    ) || null
  );
}

function findTargetExercise(message, dayExercises, bodyPart) {
  const msg = lower(message);

  for (const exercise of dayExercises) {
    const words = lower(exercise.name).split(/\s+/).filter((word) => word.length > 3);
    if (words.some((word) => msg.includes(word))) {
      return exercise;
    }
  }

  const region = bodyPart ? BODY_PART_REGION[bodyPart] : null;
  if (region) {
    const match = dayExercises.find(
      (exercise) => lower(exercise.mainMuscleGroup || exercise.muscleGroup) === region
    );
    if (match) return match;
  }

  return null;
}

function buildEffectiveProfile(profile, signal, bodyPart, message) {
  const data = plain(profile) || {};
  const limitations = Array.isArray(data.limitations) ? [...data.limitations] : [];
  let equipmentAccess = Array.isArray(data.equipmentAccess) ? [...data.equipmentAccess] : [];

  if (signal === "pain_signal" && bodyPart) {
    limitations.push(bodyPart);
  }

  if (signal === "equipment_unavailable") {
    const unavailable = detectUnavailableEquipment(message);
    if (unavailable) {
      equipmentAccess = equipmentAccess.filter((item) => !lower(item).includes(unavailable));
    }
  }

  return { ...data, limitations, equipmentAccess };
}

function pickSubstitute({ signal, target, bodyPart, profile, library, excludeIds, message }) {
  if (!Array.isArray(library) || library.length === 0) {
    return null;
  }

  const effectiveProfile = buildEffectiveProfile(profile, signal, bodyPart, message);
  const candidates = library.filter(
    (exercise) => !excludeIds.has(exercise.exerciseId) && isExerciseAllowed(exercise, effectiveProfile)
  );
  if (candidates.length === 0) {
    return null;
  }

  const targetPattern = target ? lower(target.movementPattern) : "";
  const targetMain = target ? lower(target.mainMuscleGroup || target.muscleGroup) : BODY_PART_REGION[bodyPart] || "";
  const targetSub = target ? lower(target.subMuscleGroup) : "";
  const liked = normalizeList(profile?.likedExercises);

  const ranked = candidates
    .map((exercise) => {
      let score = 0;
      const pattern = lower(exercise.movementPattern);
      const main = lower(exercise.mainMuscleGroup || exercise.muscleGroup);
      const sub = lower(exercise.subMuscleGroup);

      if (targetPattern && pattern === targetPattern) score += 3;
      if (targetMain && main === targetMain) score += 2;
      if (targetSub && sub === targetSub) score += 1;
      if (
        signal === "pain_signal" &&
        isStableLowerBodyExercise(exercise) &&
        (bodyPart === "knee" || targetMain === "legs")
      ) {
        score += 3;
      }
      if (liked.some((item) => lower(exercise.name).includes(item))) score += 1;

      return { exercise, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score || String(left.exercise.name).localeCompare(String(right.exercise.name))
    );

  return ranked[0].exercise;
}

function composeSubstituteMessage(signal, targetName, substitute) {
  const subName = substitute?.name;

  if (signal === "pain_signal") {
    return subName
      ? `Stop ${targetName || "this exercise"}. Safer option: ${subName}. Ease off and tell your coach if it persists.`
      : `Stop ${targetName || "this exercise"} and switch to a stable, pain-free movement. Tell your coach if it persists.`;
  }

  return subName
    ? `${targetName ? `${targetName} is unavailable` : "That equipment is busy"} — use ${subName} (same movement, available equipment).`
    : `Skip ${targetName || "that exercise"} for now and continue with your next available movement.`;
}

function composeAdjustmentMessage(signal, targetName) {
  if (signal === "too_hard") {
    return `Reduce ${targetName || "the load"} about 10% (or drop a set) and keep 1-2 reps in reserve.`;
  }
  if (signal === "too_easy") {
    return `Add one small load step on ${targetName ? targetName : "the next set"}.`;
  }
  return "Cut the remaining accessory volume and finish with your main lift.";
}

function buildOneSuggestion({ signal, message, profile, target, bodyPart, library, excludeIds }) {
  const config = RESPONSE_CONFIG[signal];
  const citations = (config.citationIds || []).map(resolveCitation).filter(Boolean);
  const adminRationale = citations[0]?.rationale || "";
  const publicCitations = citations.map(({ rationale, ...rest }) => rest);
  const targetName = target?.name || null;

  if (config.needsSubstitute) {
    const substitute = pickSubstitute({
      signal,
      target,
      bodyPart,
      profile: profile || {},
      library,
      excludeIds,
      message
    });
    return {
      responseType: config.responseType,
      traineeMessage: composeSubstituteMessage(signal, targetName, substitute),
      adminRationale,
      exercise: substitute ? { exerciseId: substitute.exerciseId, name: substitute.name } : null,
      citations: publicCitations
    };
  }

  return {
    responseType: config.responseType,
    traineeMessage: composeAdjustmentMessage(signal, targetName),
    adminRationale,
    exercise: null,
    citations: publicCitations
  };
}

async function loadDayExercises(session, { workoutPlanExerciseModel, exerciseModel }) {
  if (!session) return [];

  const assignments = await workoutPlanExerciseModel.findAll({
    where: {
      workoutPlanId: session.workoutPlanId,
      dayLabel: session.selectedDayLabel
    },
    include: [{ model: exerciseModel }]
  });

  return assignments
    .map((assignment) => {
      const data = plain(assignment) || {};
      return data.Exercise || null;
    })
    .filter(Boolean);
}

// Returns ranked suggestions[] (top = the one to auto-send), or [] when nothing applies or
// on any error (fully failure-safe so the live issue flow is never disrupted).
async function buildCoachResponseSuggestions({ issue, signals } = {}, options = {}) {
  try {
    const data = plain(issue) || {};
    const ordered = SIGNAL_PRIORITY.filter(
      (signal) => Array.isArray(signals) && signals.includes(signal) && RESPONSE_CONFIG[signal]
    );
    if (ordered.length === 0 || !data.userId) {
      return [];
    }

    const traineeProfileModel = options.traineeProfileModel || TraineeProfile;
    const workoutSessionModel = options.workoutSessionModel || WorkoutSession;
    const workoutPlanExerciseModel = options.workoutPlanExerciseModel || WorkoutPlanExercise;
    const exerciseModel = options.exerciseModel || Exercise;

    const profile = plain(await traineeProfileModel.findOne({ where: { userId: data.userId } }));
    const session = data.workoutSessionId
      ? plain(await workoutSessionModel.findByPk(data.workoutSessionId))
      : null;
    const dayExercises = await loadDayExercises(session, { workoutPlanExerciseModel, exerciseModel });

    const bodyPart = detectBodyPart(data.message);
    const target = findTargetExercise(data.message, dayExercises, bodyPart);

    const needsSubstitute = ordered.some((signal) => RESPONSE_CONFIG[signal].needsSubstitute);
    const library = needsSubstitute
      ? (
          await exerciseModel.findAll({
            where: { source: EXERCISE_LIBRARY_SOURCE },
            order: [["name", "ASC"]]
          })
        ).map(plain)
      : [];
    const excludeIds = new Set(
      [target?.exerciseId, ...dayExercises.map((exercise) => exercise.exerciseId)].filter(Boolean)
    );

    return ordered.map((signal) =>
      buildOneSuggestion({
        signal,
        message: data.message,
        profile,
        target,
        bodyPart,
        library,
        excludeIds
      })
    );
  } catch (error) {
    return [];
  }
}

module.exports = {
  RESPONSE_CONFIG,
  SIGNAL_PRIORITY,
  buildCoachResponseSuggestions,
  _internals: {
    buildEffectiveProfile,
    detectBodyPart,
    detectUnavailableEquipment,
    findTargetExercise,
    pickSubstitute,
    resolveCitation
  }
};
