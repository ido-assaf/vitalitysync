const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildBodyProgressSignal
} = require("../services/aiSpecialistBodyProgressService");
const {
  buildLoadPrescriptionRecommendations
} = require("../services/aiSpecialistLoadPrescriptionService");
const {
  buildFitnessProfessionalRecommendations
} = require("../services/aiSpecialistProfessionalRecommendationService");
const {
  buildWeakMuscleRecommendation
} = require("../services/aiSpecialistWeakMuscleRecommendationService");

function exercise(overrides = {}) {
  return {
    exerciseId: 11,
    exerciseName: "Bench Press",
    exposures: 5,
    trend: "progressing",
    latestBestWeight: 60,
    latestBestReps: 10,
    ...overrides
  };
}

function progressSummary(overrides = {}) {
  return {
    hasProgressData: true,
    exerciseProgress: [exercise()],
    ...overrides
  };
}

function profile(overrides = {}) {
  return {
    goal: "muscle gain",
    level: "intermediate",
    height: 175,
    specialtyPreferences: {},
    ...overrides
  };
}

function assertEvidenceContract(item) {
  assert.ok(item.ruleId, "missing ruleId");
  assert.ok(Array.isArray(item.sourceItemIds), "missing sourceItemIds");
  assert.ok(item.sourceItemIds.length > 0, "empty sourceItemIds");
  assert.ok(item.evidenceSummary, "missing evidenceSummary");
  assert.ok(item.evidenceLevel, "missing evidenceLevel");
  assert.ok(Array.isArray(item.limitations), "missing limitations");
  assert.ok(item.limitations.length > 0, "empty limitations");
  assert.match(item.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(["high", "medium", "low"].includes(item.confidence));
}

test("load prescription pauses progression when pain is present", () => {
  const result = buildLoadPrescriptionRecommendations({
    progressSummary: progressSummary(),
    adaptationDecisions: {
      readinessReasonCodes: ["recurring_pain"],
      blockedActions: ["increase_load_on_related_movements"]
    },
    profile: profile({ goal: "strength" })
  });
  const recommendation = result.recommendations[0];

  assert.equal(result.applyMode, "preview_only");
  assert.equal(recommendation.decision, "pause_progression");
  assert.equal(recommendation.applyMode, "preview_only");
  assert.equal(recommendation.ruleId, "rule_pause_progression_on_pain");
  assert.ok(recommendation.sourceItemIds.includes("src_aaos_safe_exercise"));
  assertEvidenceContract(recommendation);
});

test("load prescription uses strategy not exact load when progressing", () => {
  const result = buildLoadPrescriptionRecommendations({
    progressSummary: progressSummary(),
    adaptationDecisions: {},
    profile: profile({ goal: "strength" })
  });
  const recommendation = result.recommendations[0];

  assert.equal(recommendation.decision, "increase_load_preview");
  assert.equal(recommendation.strategy, "small_load_increase_when_completed");
  assert.equal(Object.prototype.hasOwnProperty.call(recommendation, "targetLoad"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(recommendation, "nextWeight"), false);
  assertEvidenceContract(recommendation);
});

test("body progress requires repeated measurements and remains supporting only", () => {
  const result = buildBodyProgressSignal({
    profile: profile({
      specialtyPreferences: {
        bodyProgressMeasurements: [
          {
            measuredAt: "2026-07-01",
            bodyWeightKg: 80,
            waistCm: 88
          }
        ]
      }
    }),
    progressSummary: progressSummary()
  });

  assert.equal(result.status, "insufficient_data");
  assert.equal(result.role, "supporting_trend_signal");
  assert.equal(result.applyMode, "preview_only");
  assert.equal(result.ruleId, "rule_body_trend_only");
  assertEvidenceContract(result);
});

test("body progress identifies fat-loss support without becoming a standalone decision", () => {
  const result = buildBodyProgressSignal({
    profile: profile({
      goal: "fat loss",
      specialtyPreferences: {
        bodyProgressMeasurements: [
          {
            measuredAt: "2026-06-01",
            bodyWeightKg: 84,
            waistCm: 92,
            bodyFatPercent: 25,
            bodyFatMethod: "bia"
          },
          {
            measuredAt: "2026-07-01",
            bodyWeightKg: 82,
            waistCm: 89,
            bodyFatPercent: 24,
            bodyFatMethod: "bia"
          }
        ]
      }
    }),
    progressSummary: progressSummary()
  });

  assert.equal(result.status, "trend_detected");
  assert.equal(result.role, "supporting_trend_signal");
  assert.ok(result.signals.includes("fat_loss_trend_supported"));
  assert.equal(result.ruleId, "rule_body_fat_loss_support");
  assertEvidenceContract(result);
});

test("weak muscle specialization is not applied to beginners by default", () => {
  const result = buildWeakMuscleRecommendation({
    profile: profile({ level: "beginner" }),
    progressSummary: progressSummary({
      exerciseProgress: [exercise({ trend: "plateau", exposures: 6 })]
    }),
    adaptationDecisions: {}
  });

  assert.equal(result.decision, "do_not_specialize");
  assert.equal(result.status, "not_applicable");
  assert.ok(result.reasonCodes.includes("beginner_specialization_blocked"));
  assertEvidenceContract(result);
});

test("professional recommendations aggregate preview-only evidence-mapped sections", () => {
  const result = buildFitnessProfessionalRecommendations({
    progressSummary: progressSummary(),
    adaptationDecisions: {},
    planUpdateProposal: {
      proposedChanges: [
        {
          type: "review_substitution_candidate",
          reasonCodes: ["equipment_unavailable"],
          confidence: "medium"
        }
      ],
      reasonCodes: ["equipment_unavailable"]
    },
    profile: profile()
  });

  assert.equal(result.applyMode, "preview_only");
  assert.ok(Array.isArray(result.loadPrescription.recommendations));
  assert.ok(Array.isArray(result.substitutionCandidates.recommendations));
  assert.equal(result.substitutionCandidates.recommendations[0].decision, "review_same_intent_substitute");
  assertEvidenceContract(result.loadPrescription.recommendations[0]);
  assertEvidenceContract(result.substitutionCandidates.recommendations[0]);
  assertEvidenceContract(result.bodyProgress);
  assertEvidenceContract(result.weakMuscleFocus);
});
