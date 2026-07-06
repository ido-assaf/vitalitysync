const FITNESS_WEEKLY_COACH_BRIEF_VERSION = "fitness_weekly_coach_brief_v0.1";

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
    exerciseDecisions.every((item) => item.decision === "collect_more_data")
  );
}

function reviewDecisionFor({ progressSummary, adaptationDecisions, planUpdateProposal, reasonCodes }) {
  if (planUpdateProposal?.validationSummary?.isSafeProposal === false) return "needs_review";
  if (planUpdateProposal?.updateDecision === "needs_review" || reasonCodes.includes("recurring_pain")) {
    return "needs_review";
  }
  if (planUpdateProposal?.updateDecision === "propose_changes") return "minor_adjustments";
  if (
    !hasProgressData(progressSummary) ||
    planUpdateProposal?.updateDecision === "collect_more_data" ||
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
  if (change.type === "cautious_progression") {
    return change.exerciseName
      ? `${change.exerciseName} is progressing; consider cautious progression.`
      : "Progressing exercises can use cautious progression.";
  }
  if (change.type === "review_or_adjust") {
    return change.exerciseName
      ? `${change.exerciseName} looks stuck; review the setup before changing more.`
      : "A plateau needs review before bigger changes.";
  }
  if (change.type === "simplify_session") {
    if ((change.reasonCodes || []).includes("time_constraint")) {
      return "Time constraints support simplifying the week before adding work.";
    }
    if ((change.reasonCodes || []).includes("motivation")) {
      return "Motivation signals support a simpler week to rebuild consistency.";
    }
    return "Session completion is low; simplify before adding work.";
  }
  if (change.type === "reduce_load_or_volume") {
    if ((change.reasonCodes || []).includes("too_hard")) {
      return "Difficulty signals support reducing load or volume.";
    }
    return "Performance or recovery signals support reducing load or volume.";
  }
  if (change.type === "review_substitution_candidate") {
    if ((change.reasonCodes || []).includes("equipment_unavailable")) {
      return "Equipment availability makes a substitution review appropriate.";
    }
    return "Pain signals make a substitution review appropriate.";
  }
  if (change.type === "collect_more_data") return "There is not enough exercise history for a confident adjustment.";
  return null;
}

function findingForRejectedChange(change) {
  if (change.type === "increase_volume" || change.action === "increase_volume") {
    return "Volume increase rejected by readiness signals.";
  }
  if (change.type === "cautious_progression" || change.action === "increase_reps_or_small_load") {
    return "Progression blocked by safety or readiness signals.";
  }
  if (change.type === "high_intensity_progression" || change.action === "high_intensity_progression") {
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
  if (reasonCodes.includes("low_adherence") || reasonCodes.includes("low_set_completion")) {
    findings.push("Completion is the main limiter before adding more work.");
  }
  if (reasonCodes.includes("recovery_risk")) {
    findings.push("Recovery signals suggest a conservative week.");
  }
  if (reasonCodes.includes("equipment_unavailable")) {
    findings.push("Equipment availability may require a substitution.");
  }
  if (reasonCodes.includes("too_hard")) {
    findings.push("The current prescription may be too difficult this week.");
  }

  return compact(findings, MAX_FINDINGS);
}

function buildQuestions({ reviewDecision, reasonCodes, adaptationDecisions }) {
  const questions = [];

  if (reviewDecision === "collect_more_data" || allExercisesNeedMoreData(adaptationDecisions)) {
    questions.push("Can you log sets, reps, load, and how the session felt this week?");
  }
  if (reasonCodes.includes("plateau_3_plus_exposures")) {
    questions.push("What limited the stuck lift most: load, technique, or recovery?");
  }
  if (reasonCodes.includes("low_adherence") || reasonCodes.includes("low_set_completion")) {
    questions.push("What made sessions hard to complete: time, fatigue, difficulty, or motivation?");
  }
  if (reasonCodes.includes("recurring_pain")) {
    questions.push("Which movement caused pain, and did it change during or after training?");
  }
  if (reasonCodes.includes("recovery_risk")) {
    questions.push("How were sleep, soreness, and energy across the week?");
  }
  if (reasonCodes.includes("equipment_unavailable")) {
    questions.push("Which equipment was unavailable, and what similar option was open?");
  }

  return compact(questions, MAX_QUESTIONS);
}

function buildSafetyNotes({ planUpdateProposal, reasonCodes }) {
  const notes = [];

  if (planUpdateProposal?.validationSummary?.isSafeProposal === false) {
    notes.push("Proposal validation failed; review before applying changes.");
  }
  if (reasonCodes.includes("recurring_pain")) {
    notes.push("Do not progress painful movements until reviewed.");
  }
  if (reasonCodes.includes("recovery_risk") || reasonCodes.includes("declining_performance")) {
    notes.push("Avoid high-intensity progression while recovery risk is present.");
  }
  if (reasonCodes.includes("low_adherence") || reasonCodes.includes("low_set_completion")) {
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
  if (reasonCodes.includes("low_adherence") || reasonCodes.includes("low_set_completion")) {
    return "Simplify the week and avoid increasing volume.";
  }
  if (reasonCodes.includes("recovery_risk") || reasonCodes.includes("declining_performance")) {
    return "Use a recovery-focused adjustment before progressing intensity.";
  }
  if ((planUpdateProposal?.proposedChanges || []).some((change) => change.type === "cautious_progression")) {
    return "Apply only cautious progression where the proposal allows it.";
  }
  if ((planUpdateProposal?.proposedChanges || []).some((change) => change.type === "review_or_adjust")) {
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

  if (change.type === "review_substitution_candidate") {
    if (includesAny(changeReasonCodes, ["recurring_pain", "pain_signal", "recurring_check_in_pain"])) {
      return {
        type: "review_substitution_candidate",
        label: "Review a safer substitute",
        reason: changeReasonCodes.includes("recurring_check_in_pain")
          ? "Pain was reported more than once, so review a safer substitute before progressing."
          : "Pain signals were reported, so progression should wait.",
        status: "preview_only",
        priority: 1
      };
    }
    if (includesAny(changeReasonCodes, ["equipment_unavailable", "repeated_equipment_constraint"])) {
      return {
        type: "review_substitution_candidate",
        label: "Review an available substitute",
        reason: "Equipment availability may require a similar replacement.",
        status: "preview_only",
        priority: 4
      };
    }
  }

  if (
    change.type === "simplify_session" &&
    includesAny(changeReasonCodes, ["low_adherence", "time_constraint", "repeated_time_constraint", "motivation"])
  ) {
    return {
      type: "simplify_session",
      label: "Simplify this week",
      reason: changeReasonCodes.includes("repeated_time_constraint")
        ? "Time constraints repeated, so simplify before adding work."
        : "Adherence or time signals suggest reducing optional work.",
      status: "preview_only",
      priority: 3
    };
  }

  if (
    change.type === "reduce_load_or_volume" &&
    includesAny(changeReasonCodes, [
      "recovery_risk",
      "fatigue_signal",
      "repeated_fatigue_signal",
      "too_hard",
      "declining_performance"
    ])
  ) {
    return {
      type: "reduce_load_or_volume",
      label: "Use a recovery-focused adjustment",
      reason: "Recovery or difficulty signals suggest reducing load or volume.",
      status: "preview_only",
      priority: 2
    };
  }

  if (change.type === "review_or_adjust" && changeReasonCodes.includes("plateau_3_plus_exposures")) {
    return {
      type: "review_or_adjust",
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
  if (reviewDecision === "collect_more_data" || planUpdateProposal?.updateDecision === "collect_more_data") {
    return "Keep logging this week so the coach can read the trend.";
  }
  if (reviewDecision === "keep_plan" || planUpdateProposal?.updateDecision === "maintain") {
    return "Keep the current plan. No plan change is needed right now.";
  }
  return "Nice consistency. The coach is watching trends before changing anything.";
}

function buildFitnessWeeklyCoachBrief({
  progressSummary,
  adaptationDecisions,
  planUpdateProposal,
  specialistContext = null,
  profile = null,
  expertRules = [],
  knowledgeItems = []
} = {}) {
  void specialistContext;
  void profile;
  void expertRules;
  void knowledgeItems;

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
