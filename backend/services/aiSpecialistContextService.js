const {
  NutritionFavorite,
  NutritionLogItem,
  NutritionProfile,
  SetLog,
  TraineeProfile,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession
} = require("../models");
const { summarizeCoachIntake } = require("./coachIntakeService");
const { summarizeFitnessProgress } = require("./aiSpecialistProgressSummaryService");

const HISTORY_LIMIT = 50;
const SUMMARY_ITEM_LIMIT = 5;

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

function percent(value) {
  return Math.round(Number(value) * 100);
}

function shortText(value, maximum = 90) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function stringList(value) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => shortText(item, 60))
        .filter(Boolean)
        .slice(0, SUMMARY_ITEM_LIMIT)
    : [];
}

function topValues(values, maximum = SUMMARY_ITEM_LIMIT) {
  const counts = new Map();
  values
    .map((value) => shortText(value, 70))
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maximum)
    .map(([value, count]) => ({ value, count }));
}

function countBy(values) {
  return values.reduce((counts, value) => {
    const key = shortText(value || "unknown", 40).toLowerCase() || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function summarizeProfileSafety(profile) {
  const data = plain(profile) || {};
  const specialtyPreferences =
    typeof data.specialtyPreferences === "object" && data.specialtyPreferences !== null
      ? data.specialtyPreferences
      : {};

  return {
    goal: shortText(data.goal, 60) || null,
    level: shortText(data.level, 40) || null,
    biologicalSex: shortText(data.biologicalSex, 30) || null,
    trainingDaysPerWeek: Number.isFinite(Number(data.trainingDaysPerWeek))
      ? Number(data.trainingDaysPerWeek)
      : null,
    equipmentAccess: stringList(data.equipmentAccess),
    injuries: stringList(data.injuries),
    limitations: stringList(data.limitations),
    coachIntake: summarizeCoachIntake({
      ...data,
      coachIntake: specialtyPreferences.coachIntake
    })
  };
}

function summarizeSessions(sessions) {
  const recent = sessions.map(plain).slice(0, 30);
  const completed = recent.filter((session) => {
    const status = String(session.status || "").toLowerCase();
    return (
      status === "completed" ||
      status === "finished" ||
      session.finishedAt ||
      (Number(session.totalSets) > 0 &&
        Number(session.completedSets) >= Number(session.totalSets))
    );
  });
  const active = recent.filter((session) => String(session.status || "").toLowerCase() === "active");
  const withSetTargets = recent.filter((session) => Number(session.totalSets) > 0);
  const averageSetCompletionPercent = withSetTargets.length
    ? percent(
        withSetTargets.reduce(
          (sum, session) =>
            sum + Math.min(1, Number(session.completedSets || 0) / Number(session.totalSets || 1)),
          0
        ) / withSetTargets.length
      )
    : null;

  return {
    recentCount: recent.length,
    completedCount: completed.length,
    activeCount: active.length,
    completionRate: recent.length ? percent(completed.length / recent.length) : null,
    averageSetCompletionPercent
  };
}

function summarizeSetLogs(setLogs) {
  const recent = setLogs.map(plain).slice(0, HISTORY_LIMIT);
  const exerciseIds = new Set(
    recent
      .map((log) => Number(log.exerciseId))
      .filter((exerciseId) => Number.isInteger(exerciseId) && exerciseId > 0)
  );

  return {
    recentCount: recent.length,
    distinctExercises: exerciseIds.size,
    latestLogDate: recent[0]?.logDate || recent[0]?.createDate || null
  };
}

function summarizeWorkoutIssues(issues) {
  const recent = issues.map(plain).slice(0, 30);
  const messages = recent.map((issue) => issue.message);

  return {
    recentCount: recent.length,
    severities: countBy(recent.map((issue) => issue.severity)),
    issueThemes: topValues(messages).map((item) => item.value)
  };
}

function summarizeWorkoutPlan(plan, assignments) {
  const data = plain(plan);
  if (!data) {
    return {
      hasCurrentPlan: false,
      goal: null,
      level: null,
      daysPerWeek: null,
      durationMinutes: null,
      assignmentCount: 0
    };
  }

  return {
    hasCurrentPlan: true,
    goal: shortText(data.goal, 60) || null,
    level: shortText(data.level, 40) || null,
    daysPerWeek: Number.isFinite(Number(data.daysPerWeek)) ? Number(data.daysPerWeek) : null,
    durationMinutes: Number.isFinite(Number(data.durationMinutes))
      ? Number(data.durationMinutes)
      : null,
    assignmentCount: assignments.length
  };
}

async function buildFitnessCoachContext(userId) {
  const [profile, sessions, setLogs, issues, latestPlan] = await Promise.all([
    TraineeProfile.findOne({ where: { userId } }),
    WorkoutSession.findAll({
      where: { userId },
      order: [["startedAt", "DESC"], ["workoutSessionId", "DESC"]],
      limit: 30
    }),
    SetLog.findAll({
      where: { userId },
      order: [["logDate", "DESC"], ["setLogId", "DESC"]],
      limit: HISTORY_LIMIT
    }),
    WorkoutIssue.findAll({
      where: { userId },
      order: [["createDate", "DESC"], ["issueId", "DESC"]],
      limit: 30
    }),
    WorkoutPlan.findOne({
      where: { userId },
      order: [["updateDate", "DESC"], ["planId", "DESC"]]
    })
  ]);
  const latestPlanData = plain(latestPlan);
  const assignments = latestPlanData?.planId
    ? await WorkoutPlanExercise.findAll({
        where: { workoutPlanId: latestPlanData.planId },
        limit: HISTORY_LIMIT
      })
    : [];

  return {
    domain: "fitness",
    hasHistory: sessions.length > 0 || setLogs.length > 0 || issues.length > 0,
    profile: summarizeProfileSafety(profile),
    sessions: summarizeSessions(sessions),
    setLogs: summarizeSetLogs(setLogs),
    issues: summarizeWorkoutIssues(issues),
    progressSummary: summarizeFitnessProgress({ sessions, setLogs, issues }),
    currentPlan: summarizeWorkoutPlan(latestPlan, assignments.map(plain))
  };
}

function summarizeNutritionProfile(profile, traineeProfile) {
  const nutrition = plain(profile) || {};
  const trainee = plain(traineeProfile) || {};

  return {
    goal: shortText(nutrition.goal, 60) || null,
    calorieTarget: Number.isFinite(Number(nutrition.dailyCaloriesTarget))
      ? Number(nutrition.dailyCaloriesTarget)
      : null,
    proteinTarget: Number.isFinite(Number(nutrition.dailyProteinTarget))
      ? Number(nutrition.dailyProteinTarget)
      : null,
    dietaryPreferences: stringList(nutrition.dietaryPreferences),
    allergies: stringList(nutrition.allergies),
    medicalRestrictions: stringList(nutrition.medicalRestrictions),
    profileInjuries: stringList(trainee.injuries),
    profileLimitations: stringList(trainee.limitations)
  };
}

function dayKey(value) {
  return String(value || "").slice(0, 10) || "unknown";
}

function summarizeNutritionLogs(logItems, profile) {
  const recent = logItems.map(plain).slice(0, HISTORY_LIMIT);
  const byDay = new Map();

  recent.forEach((item) => {
    const key = dayKey(item.consumedDate);
    const existing = byDay.get(key) || { calories: 0, protein: 0, count: 0 };
    existing.calories += Number(item.calories || 0);
    existing.protein += Number(item.protein || 0);
    existing.count += 1;
    byDay.set(key, existing);
  });

  const days = [...byDay.values()];
  const averageDailyCalories = days.length
    ? round(days.reduce((sum, day) => sum + day.calories, 0) / days.length)
    : null;
  const averageDailyProtein = days.length
    ? round(days.reduce((sum, day) => sum + day.protein, 0) / days.length)
    : null;
  const calorieTarget = Number(profile?.dailyCaloriesTarget);
  const proteinTarget = Number(profile?.dailyProteinTarget);

  return {
    itemCount: recent.length,
    loggedDayCount: days.length,
    averageDailyCalories,
    averageDailyProtein,
    averageCaloriesVsTargetPercent:
      Number.isFinite(calorieTarget) && calorieTarget > 0 && averageDailyCalories !== null
        ? percent(averageDailyCalories / calorieTarget)
        : null,
    averageProteinVsTargetPercent:
      Number.isFinite(proteinTarget) && proteinTarget > 0 && averageDailyProtein !== null
        ? percent(averageDailyProtein / proteinTarget)
        : null
  };
}

function summarizeNutritionPatterns(logItems) {
  const recent = logItems.map(plain).slice(0, HISTORY_LIMIT);
  const lowConfidenceEstimates = recent.filter(
    (item) => String(item.estimateConfidence || "").toLowerCase() === "low"
  );
  const cautionItems = recent.filter((item) =>
    ["caution", "not_recommended"].includes(String(item.evaluationStatus || "").toLowerCase())
  );

  return {
    statusCounts: countBy(recent.map((item) => item.evaluationStatus)),
    guidanceSourceCounts: countBy(recent.map((item) => item.guidanceSource)),
    recurringFoods: topValues(recent.map((item) => item.foodName)),
    cautionFoods: topValues(cautionItems.map((item) => item.foodName)),
    lowConfidenceEstimateCount: lowConfidenceEstimates.length,
    lowConfidenceFoods: topValues(lowConfidenceEstimates.map((item) => item.foodName))
  };
}

function summarizeFavorites(favorites) {
  return favorites
    .map(plain)
    .slice(0, SUMMARY_ITEM_LIMIT)
    .map((favorite) => ({
      name: shortText(favorite.name, 70),
      brand: shortText(favorite.brand, 50) || null
    }))
    .filter((favorite) => favorite.name);
}

async function buildNutritionistContext(userId) {
  const [nutritionProfile, traineeProfile, logItems, favorites] = await Promise.all([
    NutritionProfile.findOne({
      where: { userId },
      order: [["updateDate", "DESC"], ["nutritionProfileId", "DESC"]]
    }),
    TraineeProfile.findOne({ where: { userId } }),
    NutritionLogItem.findAll({
      where: { userId },
      order: [["consumedDate", "DESC"], ["createDate", "DESC"]],
      limit: HISTORY_LIMIT
    }),
    NutritionFavorite.findAll({
      where: { userId },
      order: [["updateDate", "DESC"]],
      limit: 30
    })
  ]);
  const profile = plain(nutritionProfile);

  return {
    domain: "nutrition",
    hasHistory: logItems.length > 0 || favorites.length > 0,
    profile: summarizeNutritionProfile(nutritionProfile, traineeProfile),
    recentLogging: summarizeNutritionLogs(logItems, profile),
    guidancePatterns: summarizeNutritionPatterns(logItems),
    favorites: summarizeFavorites(favorites)
  };
}

module.exports = {
  buildFitnessCoachContext,
  buildNutritionistContext,
  _internals: {
    summarizeNutritionLogs,
    summarizeNutritionPatterns,
    summarizeSessions,
    summarizeWorkoutIssues
  }
};
