const FITNESS_PLAN_VALIDATOR_VERSION = "fitness_plan_validator_v0.1";

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

function mainMuscle(exercise) {
  return normalizedText(exercise?.mainMuscleGroup || exercise?.muscleGroup);
}

function subMuscle(exercise) {
  return normalizedText(exercise?.subMuscleGroup);
}

function movementPattern(exercise) {
  return normalizedText(exercise?.movementPattern);
}

function exerciseName(exercise) {
  return normalizedText(exercise?.name);
}

function exerciseId(exercise) {
  return String(exercise?.exerciseId ?? exercise?.id ?? "");
}

function isPush(exercise) {
  const pattern = movementPattern(exercise);
  const muscle = mainMuscle(exercise);

  return pattern.includes("push") || muscle === "chest" || muscle === "shoulders";
}

function isPull(exercise) {
  const pattern = movementPattern(exercise);
  const muscle = mainMuscle(exercise);

  return pattern.includes("pull") || muscle === "back";
}

function isLowerBody(exercise) {
  const pattern = movementPattern(exercise);
  const muscle = mainMuscle(exercise);

  return (
    muscle === "legs" ||
    pattern.includes("squat") ||
    pattern.includes("lunge") ||
    pattern.includes("hinge")
  );
}

function isCore(exercise) {
  const pattern = movementPattern(exercise);
  const muscle = mainMuscle(exercise);
  const sub = subMuscle(exercise);

  return muscle === "core" || pattern.includes("core") || sub.includes("abs");
}

function isUpperBody(exercise) {
  return ["chest", "back", "shoulders", "arms"].includes(mainMuscle(exercise));
}

function hasExplicitLungeLimit(profile) {
  return [...list(profile?.injuries), ...list(profile?.limitations)].some(
    (item) => item.includes("lunge") || item.includes("lunges")
  );
}

function hasKneePain(profile) {
  return [...list(profile?.injuries), ...list(profile?.limitations)].some(
    (item) => item.includes("knee") || item.includes("patella")
  );
}

function dayGroups(assignments) {
  return assignments.reduce((groups, assignment) => {
    const label = assignment.dayLabel || "Workout";
    const current = groups.get(label) || [];
    groups.set(label, [...current, assignment]);
    return groups;
  }, new Map());
}

function resolveAssignments(assignments, exercises) {
  const byId = new Map((Array.isArray(exercises) ? exercises : []).map((exercise) => [
    exerciseId(exercise),
    exercise
  ]));

  return (Array.isArray(assignments) ? assignments : []).map((assignment) => ({
    ...assignment,
    exercise: assignment.exercise || assignment.Exercise || byId.get(String(assignment.exerciseId)) || null
  }));
}

function addFinding(target, severity, code, message) {
  target.push({ severity, code, message });
}

function addCorrection(target, code, action, message) {
  target.push({ code, action, message });
}

function daySetTotal(assignments) {
  return assignments.reduce((total, assignment) => {
    const sets = Number(assignment.targetSets);
    return total + (Number.isFinite(sets) ? sets : 0);
  }, 0);
}

function expectedMinimumPerDay(profile, planningModifiers) {
  const level = normalizedText(profile?.level);
  const simplified = Boolean(planningModifiers?.flags?.simplifyForAdherence);

  if (level === "advanced" || level === "expert") return 4;
  return simplified ? 3 : 3;
}

function maxSetsPerDay(profile) {
  const level = normalizedText(profile?.level);

  if (level === "advanced" || level === "expert") return 30;
  if (level === "intermediate") return 24;
  return 20;
}

function compactCodes(warnings) {
  return Array.from(
    new Set(
      warnings
        .filter((warning) => warning.severity === "critical" || warning.severity === "warning")
        .map((warning) => warning.code.split(".")[0])
    )
  ).slice(0, 3);
}

function validateFitnessPlanQuality({
  profile = {},
  assignments = [],
  exercises = [],
  knowledgeItems = [],
  planningModifiers = null
} = {}) {
  const resolved = resolveAssignments(assignments, exercises);
  const warnings = [];
  const corrections = [];
  const compactNotes = [];
  const profileDislikes = list(profile.dislikedExercises);
  const dayMap = dayGroups(resolved);
  const minimumPerDay = expectedMinimumPerDay(profile, planningModifiers);
  const setCeiling = maxSetsPerDay(profile);
  const flags = planningModifiers?.flags || {};
  const knownExerciseCount = resolved.filter((assignment) => assignment.exercise).length;

  if (resolved.length === 0) {
    addFinding(warnings, "critical", "complete.empty_plan", "Generated plan has no assigned exercises.");
    addCorrection(corrections, "complete.empty_plan", "regenerate_plan", "Regenerate with a valid exercise library.");
  }

  if (knownExerciseCount < resolved.length) {
    addFinding(warnings, "warning", "data.missing_exercise_details", "Some assignments are missing exercise details.");
  }

  for (const [dayLabel, dayAssignments] of dayMap.entries()) {
    if (dayAssignments.length < minimumPerDay) {
      addFinding(
        warnings,
        "critical",
        "complete.too_few_exercises",
        `${dayLabel} has fewer than ${minimumPerDay} exercises.`
      );
      addCorrection(corrections, "complete.too_few_exercises", "add_balancing_slot", "Add a main or core slot to complete the day.");
    }

    if (daySetTotal(dayAssignments) > setCeiling) {
      addFinding(
        warnings,
        "warning",
        "volume.high_daily_sets",
        `${dayLabel} has more sets than expected for this level.`
      );
      addCorrection(corrections, "volume.high_daily_sets", "reduce_optional_volume", "Reduce accessory or finisher volume.");
    }
  }

  const selectedExercises = resolved.map((assignment) => assignment.exercise).filter(Boolean);
  const hasPush = selectedExercises.some(isPush);
  const hasPull = selectedExercises.some(isPull);
  const hasLower = selectedExercises.some(isLowerBody);
  const hasCore = selectedExercises.some(isCore);
  const hasUpper = selectedExercises.some(isUpperBody);

  if (!hasPush) {
    addFinding(warnings, "critical", "balance.missing_push", "Plan is missing push work.");
    addCorrection(corrections, "balance.missing_push", "add_push_slot", "Add a horizontal or vertical push exercise.");
  }
  if (!hasPull) {
    addFinding(warnings, "critical", "balance.missing_pull", "Plan is missing pull work.");
    addCorrection(corrections, "balance.missing_pull", "add_pull_slot", "Add a horizontal or vertical pull exercise.");
  }
  if (!hasLower) {
    addFinding(warnings, "critical", "balance.missing_lower", "Plan is missing lower-body training.");
    addCorrection(corrections, "balance.missing_lower", "add_lower_slot", "Add a lower-body exercise that fits limitations.");
  }
  if (!hasCore) {
    addFinding(warnings, "warning", "balance.missing_core", "Plan is missing direct core work.");
    addCorrection(corrections, "balance.missing_core", "add_core_slot", "Add a core stability exercise.");
  }

  if (flags.biasLowerBodyButMaintainUpper && !hasUpper) {
    addFinding(
      warnings,
      "critical",
      "balance.missing_upper_maintenance",
      "Lower-body bias removed upper-body maintenance."
    );
    addCorrection(corrections, "balance.missing_upper_maintenance", "restore_upper_maintenance", "Keep at least one push or pull exercise.");
  }

  if (hasKneePain(profile) && !hasLower) {
    addFinding(
      warnings,
      "critical",
      "safety.knee_removed_lower_body",
      "Knee pain handling removed all lower-body training."
    );
    addCorrection(corrections, "safety.knee_removed_lower_body", "use_safer_lower_body", "Use hinge, glute, or stable lower-body alternatives.");
  }

  selectedExercises.forEach((exercise) => {
    const name = exerciseName(exercise);
    const pattern = movementPattern(exercise);
    const sub = subMuscle(exercise);

    if (profileDislikes.some((item) => name.includes(item) || item.includes(name))) {
      addFinding(warnings, "warning", "preference.disliked_exercise", `${exercise.name} matches a disliked exercise.`);
      addCorrection(corrections, "preference.disliked_exercise", "substitute_exercise", "Replace the disliked exercise.");
    }

    if (hasExplicitLungeLimit(profile) && name.includes("lunge")) {
      addFinding(warnings, "critical", "safety.explicit_painful_lunge", `${exercise.name} conflicts with a lunge pain limitation.`);
      addCorrection(corrections, "safety.explicit_painful_lunge", "substitute_exercise", "Use a stable lower-body alternative.");
    }

    if (hasKneePain(profile) && (pattern.includes("jump") || pattern.includes("conditioning"))) {
      addFinding(warnings, "warning", "safety.knee_high_stress", `${exercise.name} may be too aggressive for knee pain.`);
      addCorrection(corrections, "safety.knee_high_stress", "reduce_knee_stress", "Prefer lower-impact lower-body work.");
    }

    if (hasKneePain(profile) && sub.includes("quad") && !name.includes("box squat")) {
      addFinding(warnings, "info", "safety.knee_quad_dominant", `${exercise.name} is quad-dominant with knee pain context.`);
    }
  });

  const knowledgeIds = new Set((Array.isArray(knowledgeItems) ? knowledgeItems : []).map((item) => item.id));
  if (flags.hypertrophySelectiveFailureGuidance && !knowledgeIds.has("fit_kb_001_hypertrophy_close_to_failure")) {
    addFinding(warnings, "info", "evidence.hypertrophy_guidance_context", "Hypertrophy guidance is active without the primary close-to-failure item.");
  }

  if (warnings.length === 0) {
    compactNotes.push("plan structure passed");
  } else {
    compactNotes.push(...compactCodes(warnings));
  }

  const severityPenalty = warnings.reduce((total, warning) => {
    if (warning.severity === "critical") return total + 25;
    if (warning.severity === "warning") return total + 8;
    return total + 2;
  }, 0);
  const qualityScore = Math.max(0, Math.min(100, 100 - severityPenalty));
  const passed = !warnings.some((warning) => warning.severity === "critical") && qualityScore >= 70;

  return {
    version: FITNESS_PLAN_VALIDATOR_VERSION,
    passed,
    qualityScore,
    warnings,
    corrections,
    compactNotes: compactNotes.slice(0, 3),
    summary: {
      assignmentCount: resolved.length,
      dayCount: dayMap.size,
      hasPush,
      hasPull,
      hasLower,
      hasCore,
      hasUpper
    }
  };
}

module.exports = {
  FITNESS_PLAN_VALIDATOR_VERSION,
  validateFitnessPlanQuality,
  _internals: {
    isCore,
    isLowerBody,
    isPull,
    isPush,
    resolveAssignments
  }
};
