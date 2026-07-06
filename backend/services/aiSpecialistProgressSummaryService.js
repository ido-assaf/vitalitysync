const FITNESS_PROGRESS_SUMMARY_VERSION = "fitness_progress_summary_v0.1";

const HISTORY_LIMIT = 50;
const MAX_EXERCISE_SUMMARIES = 8;

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function normalizedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shortText(value, maximum = 90) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

function percent(value) {
  return Math.round(Number(value) * 100);
}

function dateKey(value) {
  return String(value || "").slice(0, 10) || "unknown";
}

function sessionKey(log) {
  return log.workoutSessionId ? `session:${log.workoutSessionId}` : `day:${dateKey(log.logDate || log.createDate)}`;
}

function logTime(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function exerciseNameFromLog(log) {
  return (
    shortText(log.exerciseName || log.Exercise?.name || log.exercise?.name, 80) ||
    `Exercise #${log.exerciseId}`
  );
}

function isCompletedSession(session) {
  const status = normalizedText(session.status);

  return (
    status === "completed" ||
    status === "finished" ||
    Boolean(session.finishedAt) ||
    (Number(session.totalSets) > 0 && Number(session.completedSets) >= Number(session.totalSets))
  );
}

function summarizeAdherence(sessions = []) {
  const recent = sessions.map(plain).slice(0, 30);
  const completed = recent.filter(isCompletedSession);
  const withTargets = recent.filter((session) => Number(session.totalSets) > 0);
  const averageSetCompletionPercent = withTargets.length
    ? percent(
        withTargets.reduce(
          (sum, session) =>
            sum + Math.min(1, Number(session.completedSets || 0) / Number(session.totalSets || 1)),
          0
        ) / withTargets.length
      )
    : null;

  return {
    recentSessions: recent.length,
    completedSessions: completed.length,
    completionRate: recent.length ? percent(completed.length / recent.length) : null,
    averageSetCompletionPercent
  };
}

function groupExerciseLogs(setLogs = []) {
  const groups = new Map();

  setLogs
    .map(plain)
    .slice(0, HISTORY_LIMIT)
    .filter((log) => Number.isInteger(Number(log.exerciseId)))
    .forEach((log) => {
      const key = String(log.exerciseId);
      const current = groups.get(key) || [];
      current.push(log);
      groups.set(key, current);
    });

  return groups;
}

function exposureSummaries(logs) {
  const exposureMap = new Map();

  logs.forEach((log) => {
    const key = sessionKey(log);
    const current = exposureMap.get(key) || {
      key,
      date: log.logDate || log.createDate || null,
      totalSets: 0,
      completedSets: 0,
      bestWeight: 0,
      bestReps: 0,
      bestSetScore: 0,
      volume: 0
    };
    const weight = Number(log.weight);
    const reps = Number(log.reps);
    const completed = log.completed !== false;
    const setScore = (Number.isFinite(weight) ? weight : 0) * (Number.isFinite(reps) ? reps : 0);

    current.totalSets += 1;
    current.completedSets += completed ? 1 : 0;
    current.bestWeight = Math.max(current.bestWeight, Number.isFinite(weight) ? weight : 0);
    current.bestReps = Math.max(current.bestReps, Number.isFinite(reps) ? reps : 0);
    current.bestSetScore = Math.max(current.bestSetScore, setScore);
    current.volume += setScore;
    exposureMap.set(key, current);
  });

  return [...exposureMap.values()].sort((left, right) => logTime(left.date) - logTime(right.date));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function progressTrend(exposures) {
  if (exposures.length < 3) {
    return "insufficient_data";
  }

  const firstWindow = exposures.slice(0, Math.max(1, Math.floor(exposures.length / 2)));
  const recentWindow = exposures.slice(-Math.max(2, Math.ceil(exposures.length / 2)));
  const firstAverage = average(firstWindow.map((item) => item.bestSetScore || item.volume));
  const recentAverage = average(recentWindow.map((item) => item.bestSetScore || item.volume));

  if (firstAverage <= 0 && recentAverage <= 0) {
    return "insufficient_data";
  }

  const delta = firstAverage > 0 ? (recentAverage - firstAverage) / firstAverage : 1;

  if (delta > 0.05) return "progressing";
  if (delta < -0.05) return "declining";
  return "plateau";
}

function recommendationForTrend(trend, exposures) {
  if (trend === "progressing") return "progress_cautiously";
  if (trend === "declining") return "reduce_or_recover";
  if (trend === "plateau" && exposures.length >= 3) return "review_or_adjust";
  return "collect_more_data";
}

function summarizeExerciseProgress(setLogs = []) {
  return [...groupExerciseLogs(setLogs).entries()]
    .map(([exerciseId, logs]) => {
      const sortedLogs = logs
        .map(plain)
        .sort((left, right) => logTime(left.logDate || left.createDate) - logTime(right.logDate || right.createDate));
      const exposures = exposureSummaries(sortedLogs);
      const trend = progressTrend(exposures);
      const completedSetCount = sortedLogs.filter((log) => log.completed !== false).length;
      const latestExposure = exposures[exposures.length - 1] || {};

      return {
        exerciseId: Number(exerciseId),
        exerciseName: exerciseNameFromLog(sortedLogs[sortedLogs.length - 1] || sortedLogs[0] || {}),
        exposures: exposures.length,
        loggedSets: sortedLogs.length,
        completedSetCount,
        trend,
        recommendation: recommendationForTrend(trend, exposures),
        latestBestWeight: latestExposure.bestWeight || 0,
        latestBestReps: latestExposure.bestReps || 0,
        latestVolume: round(latestExposure.volume || 0)
      };
    })
    .sort((left, right) => {
      const priority = { declining: 0, plateau: 1, progressing: 2, insufficient_data: 3 };
      return (
        (priority[left.trend] ?? 4) - (priority[right.trend] ?? 4) ||
        right.exposures - left.exposures ||
        left.exerciseName.localeCompare(right.exerciseName)
      );
    })
    .slice(0, MAX_EXERCISE_SUMMARIES);
}

function topValues(values, maximum = 5) {
  const counts = new Map();
  values
    .map((value) => shortText(value, 90))
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maximum)
    .map(([value, count]) => ({ value, count }));
}

function summarizeProgressIssues(issues = []) {
  const recent = issues.map(plain).slice(0, 30);
  const messages = recent.map((issue) => shortText(issue.message, 90)).filter(Boolean);
  const painMessages = messages.filter((message) =>
    ["pain", "discomfort", "ache", "hurt", "כאב", "כואב"].some((term) =>
      normalizedText(message).includes(term)
    )
  );
  const fatigueMessages = messages.filter((message) =>
    ["fatigue", "tired", "exhausted", "recovery", "עייף", "עייפות"].some((term) =>
      normalizedText(message).includes(term)
    )
  );

  return {
    recentIssueCount: recent.length,
    recurringPainPatterns: topValues(painMessages).map((item) => item.value),
    fatigueSignals: topValues(fatigueMessages).map((item) => item.value)
  };
}

function readinessFlags({ adherenceSummary, exerciseProgress, issueSummary }) {
  const flags = [];

  if (
    Number(adherenceSummary.recentSessions) >= 3 &&
    Number(adherenceSummary.completionRate) < 60
  ) {
    flags.push("low_adherence");
  }
  if (
    Number(adherenceSummary.recentSessions) >= 2 &&
    Number.isFinite(Number(adherenceSummary.averageSetCompletionPercent)) &&
    Number(adherenceSummary.averageSetCompletionPercent) < 70
  ) {
    flags.push("low_set_completion");
  }
  if (exerciseProgress.some((item) => item.trend === "declining")) {
    flags.push("declining_exercise_performance");
  }
  if (exerciseProgress.some((item) => item.trend === "plateau")) {
    flags.push("possible_plateau");
  }
  if (issueSummary.recurringPainPatterns.length > 0) {
    flags.push("recurring_pain_reported");
  }
  if (issueSummary.fatigueSignals.length > 0) {
    flags.push("limited_recovery_signal");
  }
  if (flags.length > 0) {
    flags.push("avoid_aggressive_progression");
  }

  return [...new Set(flags)];
}

function summarizeFitnessProgress({ sessions = [], setLogs = [], issues = [] } = {}) {
  const adherenceSummary = summarizeAdherence(sessions);
  const exerciseProgress = summarizeExerciseProgress(setLogs);
  const issueSummary = summarizeProgressIssues(issues);

  return {
    version: FITNESS_PROGRESS_SUMMARY_VERSION,
    hasProgressData:
      adherenceSummary.recentSessions > 0 ||
      exerciseProgress.length > 0 ||
      issueSummary.recentIssueCount > 0,
    adherenceSummary,
    exerciseProgress,
    issueSummary,
    readinessFlags: readinessFlags({ adherenceSummary, exerciseProgress, issueSummary })
  };
}

module.exports = {
  FITNESS_PROGRESS_SUMMARY_VERSION,
  summarizeFitnessProgress,
  _internals: {
    exposureSummaries,
    progressTrend,
    summarizeAdherence,
    summarizeExerciseProgress,
    summarizeProgressIssues
  }
};
