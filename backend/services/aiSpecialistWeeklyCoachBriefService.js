const FITNESS_WEEKLY_COACH_BRIEF_VERSION = "fitness_weekly_coach_brief_v0.1";

const {
  EXERCISE_DECISIONS,
  PLAN_UPDATE_DECISIONS,
  REASON_CODES,
  REVIEW_ACTION_TYPES,
  hasAnyReason,
  hasReason
} = require("../constants/aiSpecialistReasonCodes");

const MAX_FINDINGS = 4;
const MAX_QUESTIONS = 3;
const MAX_SAFETY_NOTES = 3;
const MAX_REVIEW_ACTIONS = 3;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function compact(values, maximum) {
  return unique(values).slice(0, maximum);
}

function includesAny(values = [], candidates = []) {
  return candidates.some((candidate) => values.includes(candidate));
}

function hasProgressData(progressSummary) {
  return Boolean(
    progressSummary &&
      (progressSummary.hasProgressData ||
        (progressSummary.exerciseProgress || []).length > 0 ||
        Number(progressSummary.adherenceSummary?.recentSessions) > 0 ||
        Number(progressSummary.issueSummary?.recentIssueCount) > 0)
  );
}

function reasonCodesFrom({ adaptationDecisions, planUpdateProposal }) {
  return unique([
    ...(adaptationDecisions?.readinessReasonCodes || []),
    ...(adaptationDecisions?.reasonCodes || []),
    ...(planUpdateProposal?.reasonCodes || [])
  ]);
}

function allExercisesNeedMoreData(adaptationDecisions) {
  const exerciseDecisions = adaptationDecisions?.exerciseDecisions || [];

  return (
    exerciseDecisions.length > 0 &&
    exerciseDecisions.every((item) => item.decision === EXERCISE_DECISIONS.COLLECT_MORE_DATA)
  );
}

function reviewDecisionFor({ progressSummary, adaptationDecisions, planUpdateProposal, reasonCodes }) {
  if (planUpdateProposal?.validationSummary?.isSafeProposal === false) return "needs_review";
  if (
    planUpdateProposal?.updateDecision === PLAN_UPDATE_DECISIONS.NEEDS_REVIEW ||
    hasReason(reasonCodes, REASON_CODES.RECURRING_PAIN)
  ) {
    return "needs_review";
  }
  if (planUpdateProposal?.updateDecision === PLAN_UPDATE_DECISIONS.PROPOSE_CHANGES) return "minor_adjustments";
  if (
    !hasProgressData(progressSummary) ||
    planUpdateProposal?.updateDecision === PLAN_UPDATE_DECISIONS.COLLECT_MORE_DATA ||
    allExercisesNeedMoreData(adaptationDecisions)
  ) {
    return "collect_more_data";
  }
  return "keep_plan";
}

function headlineFor(reviewDecision) {
  if (reviewDecision === "needs_review") return "Review needed before changing the plan.";
  if (reviewDecision === "minor_adjustments") return "Small plan adjustments are worth considering.";
  if (reviewDecision === "collect_more_data") return "Keep logging before changing the plan.";
  return "Current plan can stay in place.";
}

function findingForChange(change) {
  if (change.type === REVIEW_ACTION_TYPES.CAUTIOUS_PROGRESSION) {
    return change.exerciseName
      ? `${change.exerciseName} is progressing; consider cautious progression.`
      : "Progressing exercises can use cautious progression.";
  }
  if (change.type === REVIEW_ACTION_TYPES.REVIEW_OR_ADJUST) {
    return change.exerciseName
      ? `${change.exerciseName} looks stuck; review the setup before changing more.`
      : "A plateau needs review before bigger changes.";
  }
  if (change.type === REVIEW_ACTION_TYPES.SIMPLIFY_SESSION) {
    if (hasReason(change.reasonCodes || [], REASON_CODES.TIME_CONSTRAINT)) {
      return "Time constraints support simplifying the week before adding work.";
    }
    if (hasReason(change.reasonCodes || [], REASON_CODES.MOTIVATION)) {
      return "Motivation signals support a simpler week to rebuild consistency.";
    }
    return "Session completion is low; simplify before adding work.";
  }
  if (change.type === REVIEW_ACTION_TYPES.REDUCE_LOAD_OR_VOLUME) {
    if (hasReason(change.reasonCodes || [], REASON_CODES.TOO_HARD)) {
      return "Difficulty signals support reducing load or volume.";
    }
    return "Performance or recovery signals support reducing load or volume.";
  }
  if (change.type === REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE) {
    if (hasReason(change.reasonCodes || [], REASON_CODES.EQUIPMENT_UNAVAILABLE)) {
      return "Equipment availability makes a substitution review appropriate.";
    }
    return "Pain signals make a substitution review appropriate.";
  }
  if (change.type === REVIEW_ACTION_TYPES.COLLECT_MORE_DATA) {
    return "There is not enough exercise history for a confident adjustment.";
  }
  return null;
}

function findingForRejectedChange(change) {
  if (change.type === REVIEW_ACTION_TYPES.INCREASE_VOLUME || change.action === "increase_volume") {
    return "Volume increase rejected by readiness signals.";
  }
  if (change.type === REVIEW_ACTION_TYPES.CAUTIOUS_PROGRESSION || change.action === "increase_reps_or_small_load") {
    return "Progression blocked by safety or readiness signals.";
  }
  if (
    change.type === REVIEW_ACTION_TYPES.HIGH_INTENSITY_PROGRESSION ||
    change.action === "high_intensity_progression"
  ) {
    return "High-intensity progression rejected by recovery signals.";
  }
  return "Unsafe or low-confidence change was rejected.";
}

function buildFindings({ progressSummary, adaptationDecisions, planUpdateProposal, reasonCodes }) {
  const findings = [];

  (planUpdateProposal?.proposedChanges || []).forEach((change) => findings.push(findingForChange(change)));
  (planUpdateProposal?.rejectedChanges || []).forEach((change) => findings.push(findingForRejectedChange(change)));

  if (!hasProgressData(progressSummary)) {
    findings.push("No recent training history is available yet.");
  }
  if (allExercisesNeedMoreData(adaptationDecisions)) {
    findings.push("Exercise history is still too thin for a confident change.");
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.LOW_ADHERENCE, REASON_CODES.LOW_SET_COMPLETION])) {
    findings.push("Completion is the main limiter before adding more work.");
  }
  if (hasReason(reasonCodes, REASON_CODES.RECOVERY_RISK)) {
    findings.push("Recovery signals suggest a conservative week.");
  }
  if (hasReason(reasonCodes, REASON_CODES.EQUIPMENT_UNAVAILABLE)) {
    findings.push("Equipment availability may require a substitution.");
  }
  if (hasReason(reasonCodes, REASON_CODES.TOO_HARD)) {
    findings.push("The current prescription may be too difficult this week.");
  }

  return compact(findings, MAX_FINDINGS);
}

function buildQuestions({ reviewDecision, reasonCodes, adaptationDecisions }) {
  const questions = [];

  if (reviewDecision === "collect_more_data" || allExercisesNeedMoreData(adaptationDecisions)) {
    questions.push("Can you log sets, reps, load, and how the session felt this week?");
  }
  if (hasReason(reasonCodes, REASON_CODES.PLATEAU_3_PLUS_EXPOSURES)) {
    questions.push("What limited the stuck lift most: load, technique, or recovery?");
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.LOW_ADHERENCE, REASON_CODES.LOW_SET_COMPLETION])) {
    questions.push("What made sessions hard to complete: time, fatigue, difficulty, or motivation?");
  }
  if (hasReason(reasonCodes, REASON_CODES.RECURRING_PAIN)) {
    questions.push("Which movement caused pain, and did it change during or after training?");
  }
  if (hasReason(reasonCodes, REASON_CODES.RECOVERY_RISK)) {
    questions.push("How were sleep, soreness, and energy across the week?");
  }
  if (hasReason(reasonCodes, REASON_CODES.EQUIPMENT_UNAVAILABLE)) {
    questions.push("Which equipment was unavailable, and what similar option was open?");
  }

  return compact(questions, MAX_QUESTIONS);
}

function buildSafetyNotes({ planUpdateProposal, reasonCodes }) {
  const notes = [];

  if (planUpdateProposal?.validationSummary?.isSafeProposal === false) {
    notes.push("Proposal validation failed; review before applying changes.");
  }
  if (hasReason(reasonCodes, REASON_CODES.RECURRING_PAIN)) {
    notes.push("Do not progress painful movements until reviewed.");
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.RECOVERY_RISK, REASON_CODES.DECLINING_PERFORMANCE])) {
    notes.push("Avoid high-intensity progression while recovery risk is present.");
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.LOW_ADHERENCE, REASON_CODES.LOW_SET_COMPLETION])) {
    notes.push("Avoid adding volume until completion improves.");
  }

  return compact(notes, MAX_SAFETY_NOTES);
}

function recommendedNextStepFor({ reviewDecision, planUpdateProposal, reasonCodes }) {
  if (reviewDecision === "needs_review") {
    return "Review pain or safety signals before applying changes.";
  }
  if (reviewDecision === "collect_more_data") {
    return "Keep the plan stable and collect clearer training logs this week.";
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.LOW_ADHERENCE, REASON_CODES.LOW_SET_COMPLETION])) {
    return "Simplify the week and avoid increasing volume.";
  }
  if (hasAnyReason(reasonCodes, [REASON_CODES.RECOVERY_RISK, REASON_CODES.DECLINING_PERFORMANCE])) {
    return "Use a recovery-focused adjustment before progressing intensity.";
  }
  if (
    (planUpdateProposal?.proposedChanges || []).some(
      (change) => change.type === REVIEW_ACTION_TYPES.CAUTIOUS_PROGRESSION
    )
  ) {
    return "Apply only cautious progression where the proposal allows it.";
  }
  if (
    (planUpdateProposal?.proposedChanges || []).some((change) => change.type === REVIEW_ACTION_TYPES.REVIEW_OR_ADJUST)
  ) {
    return "Review stuck exercises before making larger plan changes.";
  }
  return "Keep the current plan and reassess after the next logged sessions.";
}

function confidenceFor({ reviewDecision, planUpdateProposal, adaptationDecisions }) {
  if (reviewDecision === "collect_more_data") return "low";
  if (planUpdateProposal?.confidence) return planUpdateProposal.confidence;
  return adaptationDecisions?.readinessConfidence || "medium";
}

function reviewActionForChange(change, reasonCodes) {
  if (!change || change.confidence === "low") return null;

  const localReasonCodes = change.reasonCodes || [];
  const changeReasonCodes = localReasonCodes.length > 0 ? unique(localReasonCodes) : reasonCodes;

  if (change.type === REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE) {
    if (
      includesAny(changeReasonCodes, [
        REASON_CODES.RECURRING_PAIN,
        REASON_CODES.PAIN_SIGNAL,
        REASON_CODES.RECURRING_CHECK_IN_PAIN
      ])
    ) {
      return {
        type: REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE,
        label: "Review a safer substitute",
        reason: hasReason(changeReasonCodes, REASON_CODES.RECURRING_CHECK_IN_PAIN)
          ? "Pain was reported more than once, so review a safer substitute before progressing."
          : "Pain signals were reported, so progression should wait.",
        status: "preview_only",
        priority: 1
      };
    }
    if (
      includesAny(changeReasonCodes, [
        REASON_CODES.EQUIPMENT_UNAVAILABLE,
        REASON_CODES.REPEATED_EQUIPMENT_CONSTRAINT
      ])
    ) {
      return {
        type: REVIEW_ACTION_TYPES.REVIEW_SUBSTITUTION_CANDIDATE,
        label: "Review an available substitute",
        reason: "Equipment availability may require a similar replacement.",
        status: "preview_only",
        priority: 4
      };
    }
  }

  if (
    change.type === REVIEW_ACTION_TYPES.SIMPLIFY_SESSION &&
    includesAny(changeReasonCodes, [
      REASON_CODES.LOW_ADHERENCE,
      REASON_CODES.TIME_CONSTRAINT,
      REASON_CODES.REPEATED_TIME_CONSTRAINT,
      REASON_CODES.MOTIVATION
    ])
  ) {
    return {
      type: REVIEW_ACTION_TYPES.SIMPLIFY_SESSION,
      label: "Simplify this week",
      reason: hasReason(changeReasonCodes, REASON_CODES.REPEATED_TIME_CONSTRAINT)
        ? "Time constraints repeated, so simplify before adding work."
        : "Adherence or time signals suggest reducing optional work.",
      status: "preview_only",
      priority: 3
    };
  }

  if (
    change.type === REVIEW_ACTION_TYPES.REDUCE_LOAD_OR_VOLUME &&
    includesAny(changeReasonCodes, [
      REASON_CODES.RECOVERY_RISK,
      REASON_CODES.FATIGUE_SIGNAL,
      REASON_CODES.REPEATED_FATIGUE_SIGNAL,
      REASON_CODES.TOO_HARD,
      REASON_CODES.DECLINING_PERFORMANCE
    ])
  ) {
    return {
      type: REVIEW_ACTION_TYPES.REDUCE_LOAD_OR_VOLUME,
      label: "Use a recovery-focused adjustment",
      reason: "Recovery or difficulty signals suggest reducing load or volume.",
      status: "preview_only",
      priority: 2
    };
  }

  if (
    change.type === REVIEW_ACTION_TYPES.REVIEW_OR_ADJUST &&
    hasReason(changeReasonCodes, REASON_CODES.PLATEAU_3_PLUS_EXPOSURES)
  ) {
    return {
      type: REVIEW_ACTION_TYPES.REVIEW_OR_ADJUST,
      label: "Review the stuck exercise",
      reason: "A plateau needs setup review before bigger changes.",
      status: "preview_only",
      priority: 5
    };
  }

  return null;
}

function buildReviewActions({ planUpdateProposal, reasonCodes }) {
  const seen = new Set();
  const actions = (planUpdateProposal?.proposedChanges || [])
    .map((change) => reviewActionForChange(change, reasonCodes))
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority)
    .filter((action) => {
      const key = `${action.type}:${action.label}:${action.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return actions.slice(0, MAX_REVIEW_ACTIONS);
}

function coachNoteFor({ reviewDecision, planUpdateProposal, reviewActions }) {
  if (reviewActions.length > 0) {
    return "These are review suggestions, not automatic plan changes.";
  }
  if (
    reviewDecision === "collect_more_data" ||
    planUpdateProposal?.updateDecision === PLAN_UPDATE_DECISIONS.COLLECT_MORE_DATA
  ) {
    return "Keep logging this week so the coach can read the trend.";
  }
  if (reviewDecision === "keep_plan" || planUpdateProposal?.updateDecision === PLAN_UPDATE_DECISIONS.MAINTAIN) {
    return "Keep the current plan. No plan change is needed right now.";
  }
  return "Nice consistency. The coach is watching trends before changing anything.";
}

function buildFitnessWeeklyCoachBrief({
  progressSummary,
  adaptationDecisions,
  planUpdateProposal
} = {}) {
  const reasonCodes = reasonCodesFrom({ adaptationDecisions, planUpdateProposal });
  const reviewDecision = reviewDecisionFor({
    progressSummary,
    adaptationDecisions,
    planUpdateProposal,
    reasonCodes
  });
  const reviewActions = buildReviewActions({ planUpdateProposal, reasonCodes });

  return {
    version: FITNESS_WEEKLY_COACH_BRIEF_VERSION,
    reviewDecision,
    headline: headlineFor(reviewDecision),
    keyFindings: buildFindings({ progressSummary, adaptationDecisions, planUpdateProposal, reasonCodes }),
    coachQuestions: buildQuestions({ reviewDecision, reasonCodes, adaptationDecisions }),
    recommendedNextStep: recommendedNextStepFor({ reviewDecision, planUpdateProposal, reasonCodes }),
    safetyNotes: buildSafetyNotes({ planUpdateProposal, reasonCodes }),
    reviewActions,
    coachNote: coachNoteFor({ reviewDecision, planUpdateProposal, reviewActions }),
    confidence: confidenceFor({ reviewDecision, planUpdateProposal, adaptationDecisions }),
    reasonCodes
  };
}

module.exports = {
  FITNESS_WEEKLY_COACH_BRIEF_VERSION,
  buildFitnessWeeklyCoachBrief,
  _internals: {
    reviewDecisionFor,
    buildFindings,
    buildQuestions,
    buildSafetyNotes,
    buildReviewActions,
    coachNoteFor
  }
};
