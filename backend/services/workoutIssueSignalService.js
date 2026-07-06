const { Op } = require("sequelize");
const { WorkoutIssue } = require("../models");
const { createFreeTextClassifier } = require("./freeTextClassificationService");
const {
  IRRELEVANT_PATTERNS,
  NEUTRAL_VALID_PATTERNS,
  classifyWeeklyCheckInWithLlm,
  parseWeeklyCheckInTags
} = require("./aiSpecialistWeeklyCheckInService");

// Live-workout issue reports reuse the shared classifier engine, but with a smaller
// signal set and a separate learned-pattern cache scope: in-session issues are
// temporary/contextual ("machine is busy") and must not leak into weekly-check-in
// learning or influence future plans.
const WORKOUT_ISSUE_CACHE_SCOPE = "live_issue";
const MAX_CLASSIFIED_ISSUES_PER_SESSION = 3;

const WORKOUT_ISSUE_SIGNALS = new Set([
  "pain_signal",
  "fatigue_signal",
  "equipment_unavailable",
  "too_hard",
  "too_easy"
]);

// Reuse the check-in keyword matcher (he/en), restricted to the issue subset. The
// subset filter is required because classifyBuiltIn returns parsed tags before the
// engine applies its allowed-signal filter.
function parseWorkoutIssueTags(text) {
  return parseWeeklyCheckInTags(text).filter((tag) => WORKOUT_ISSUE_SIGNALS.has(tag));
}

const workoutIssueClassifier = createFreeTextClassifier({
  allowedSignals: WORKOUT_ISSUE_SIGNALS,
  parseTags: parseWorkoutIssueTags,
  neutralValidPatterns: NEUTRAL_VALID_PATTERNS,
  irrelevantPatterns: IRRELEVANT_PATTERNS,
  defaultLlmClassifier: classifyWeeklyCheckInWithLlm,
  cacheScope: WORKOUT_ISSUE_CACHE_SCOPE
});

function plain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function issueIdOf(issue) {
  const data = plain(issue) || {};
  return data.issueId ?? data.id ?? null;
}

async function countClassifiedIssues(workoutSessionId, workoutIssueModel) {
  if (!workoutIssueModel?.count) return 0;

  return workoutIssueModel.count({
    where: {
      workoutSessionId,
      signals: { [Op.ne]: null }
    }
  });
}

// Fire-and-forget safe. Classifies one issue report's free text and persists the
// extracted signal tags onto the issue row. Returns the tags to emit (only when
// actionable and non-empty), or null when nothing should be surfaced (empty text,
// per-session cap reached, or non-actionable classification).
async function classifyAndAttachWorkoutIssueSignals(issue, options = {}) {
  const workoutIssueModel = options.workoutIssueModel || WorkoutIssue;
  const data = plain(issue) || {};
  const message = String(data.message || "").trim();
  const workoutSessionId = data.workoutSessionId;

  if (!message || !workoutSessionId) {
    return null;
  }

  const classifiedCount = await countClassifiedIssues(workoutSessionId, workoutIssueModel);
  if (classifiedCount >= MAX_CLASSIFIED_ISSUES_PER_SESSION) {
    return null;
  }

  const classification = await workoutIssueClassifier.classifyText(message, options);
  const signals =
    classification.qualityCategory === "actionable" && Array.isArray(classification.signals)
      ? classification.signals.filter((tag) => WORKOUT_ISSUE_SIGNALS.has(tag))
      : [];

  // Persisting signals (even []) marks the issue as classified for the per-session cap.
  if (typeof issue?.update === "function") {
    await issue.update({ signals });
  }

  if (signals.length === 0) {
    return null;
  }

  return { issueId: issueIdOf(issue), signals };
}

module.exports = {
  MAX_CLASSIFIED_ISSUES_PER_SESSION,
  WORKOUT_ISSUE_CACHE_SCOPE,
  WORKOUT_ISSUE_SIGNALS,
  classifyAndAttachWorkoutIssueSignals,
  parseWorkoutIssueTags,
  workoutIssueClassifier
};
