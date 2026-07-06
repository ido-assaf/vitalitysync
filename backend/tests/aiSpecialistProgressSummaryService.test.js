const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FITNESS_PROGRESS_SUMMARY_VERSION,
  summarizeFitnessProgress
} = require("../services/aiSpecialistProgressSummaryService");

function session(status, totalSets, completedSets, extra = {}) {
  return {
    status,
    totalSets,
    completedSets,
    ...extra
  };
}

function log(exerciseId, exerciseName, workoutSessionId, weight, reps, logDate, completed = true) {
  return {
    exerciseId,
    exerciseName,
    workoutSessionId,
    weight,
    reps,
    completed,
    logDate
  };
}

function issue(message, severity = "medium") {
  return { message, severity };
}

function byExercise(summary, exerciseName) {
  return summary.exerciseProgress.find((item) => item.exerciseName === exerciseName);
}

test("fitness progress summary handles empty history", () => {
  const summary = summarizeFitnessProgress();

  assert.equal(summary.version, FITNESS_PROGRESS_SUMMARY_VERSION);
  assert.equal(summary.hasProgressData, false);
  assert.equal(summary.adherenceSummary.recentSessions, 0);
  assert.deepEqual(summary.exerciseProgress, []);
  assert.deepEqual(summary.readinessFlags, []);
});

test("fitness progress summary detects plateau and low adherence", () => {
  const summary = summarizeFitnessProgress({
    sessions: [
      session("finished", 12, 12),
      session("active", 12, 5),
      session("missed", 12, 0),
      session("finished", 12, 8)
    ],
    setLogs: [
      log(10, "Bench Chest Press", 1, 40, 10, "2026-06-01"),
      log(10, "Bench Chest Press", 1, 40, 9, "2026-06-01"),
      log(10, "Bench Chest Press", 2, 40, 10, "2026-06-08"),
      log(10, "Bench Chest Press", 2, 40, 9, "2026-06-08"),
      log(10, "Bench Chest Press", 3, 40, 10, "2026-06-15"),
      log(10, "Bench Chest Press", 3, 40, 8, "2026-06-15")
    ]
  });
  const bench = byExercise(summary, "Bench Chest Press");

  assert.equal(summary.hasProgressData, true);
  assert.equal(summary.adherenceSummary.recentSessions, 4);
  assert.equal(summary.adherenceSummary.completedSessions, 2);
  assert.equal(summary.adherenceSummary.completionRate, 50);
  assert.equal(bench.trend, "plateau");
  assert.equal(bench.recommendation, "review_or_adjust");
  assert.ok(summary.readinessFlags.includes("low_adherence"));
  assert.ok(summary.readinessFlags.includes("possible_plateau"));
  assert.ok(summary.readinessFlags.includes("avoid_aggressive_progression"));
});

test("fitness progress summary detects progressing and declining exercises", () => {
  const summary = summarizeFitnessProgress({
    setLogs: [
      log(20, "Hip Thrust", 1, 50, 8, "2026-06-01"),
      log(20, "Hip Thrust", 2, 55, 8, "2026-06-08"),
      log(20, "Hip Thrust", 3, 60, 8, "2026-06-15"),
      log(30, "Shoulder Press", 1, 25, 8, "2026-06-01"),
      log(30, "Shoulder Press", 2, 22.5, 8, "2026-06-08"),
      log(30, "Shoulder Press", 3, 20, 8, "2026-06-15")
    ]
  });

  assert.equal(byExercise(summary, "Hip Thrust").trend, "progressing");
  assert.equal(byExercise(summary, "Hip Thrust").recommendation, "progress_cautiously");
  assert.equal(byExercise(summary, "Shoulder Press").trend, "declining");
  assert.equal(byExercise(summary, "Shoulder Press").recommendation, "reduce_or_recover");
  assert.ok(summary.readinessFlags.includes("declining_exercise_performance"));
});

test("fitness progress summary keeps insufficient data conservative", () => {
  const summary = summarizeFitnessProgress({
    setLogs: [
      log(40, "Lat Pulldown", 1, 35, 10, "2026-06-01"),
      log(40, "Lat Pulldown", 2, 37.5, 9, "2026-06-08")
    ]
  });
  const pulldown = byExercise(summary, "Lat Pulldown");

  assert.equal(pulldown.exposures, 2);
  assert.equal(pulldown.trend, "insufficient_data");
  assert.equal(pulldown.recommendation, "collect_more_data");
});

test("fitness progress summary extracts recurring pain and fatigue signals", () => {
  const summary = summarizeFitnessProgress({
    issues: [
      issue("knee pain on lunges"),
      issue("knee pain on lunges"),
      issue("felt tired and recovery was poor")
    ]
  });

  assert.deepEqual(summary.issueSummary.recurringPainPatterns, ["knee pain on lunges"]);
  assert.deepEqual(summary.issueSummary.fatigueSignals, ["felt tired and recovery was poor"]);
  assert.ok(summary.readinessFlags.includes("recurring_pain_reported"));
  assert.ok(summary.readinessFlags.includes("limited_recovery_signal"));
  assert.ok(summary.readinessFlags.includes("avoid_aggressive_progression"));
});
