const test = require("node:test");
const assert = require("node:assert/strict");
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
const {
  buildFitnessCoachContext,
  buildNutritionistContext
} = require("../services/aiSpecialistContextService");

function mockModelMethods(overrides, run) {
  const originals = [];

  Object.entries(overrides).forEach(([key, value]) => {
    const [modelName, methodName] = key.split(".");
    const model = {
      NutritionFavorite,
      NutritionLogItem,
      NutritionProfile,
      SetLog,
      TraineeProfile,
      WorkoutIssue,
      WorkoutPlan,
      WorkoutPlanExercise,
      WorkoutSession
    }[modelName];

    originals.push({ model, methodName, original: model[methodName] });
    model[methodName] = value;
  });

  return Promise.resolve()
    .then(run)
    .finally(() => {
      originals.forEach(({ model, methodName, original }) => {
        model[methodName] = original;
      });
    });
}

test("fitness context handles empty history safely", async () => {
  await mockModelMethods(
    {
      "TraineeProfile.findOne": async () => null,
      "WorkoutSession.findAll": async () => [],
      "SetLog.findAll": async () => [],
      "WorkoutIssue.findAll": async () => [],
      "WorkoutPlan.findOne": async () => null,
      "WorkoutPlanExercise.findAll": async () => {
        throw new Error("assignments should not be queried without a plan");
      }
    },
    async () => {
      const context = await buildFitnessCoachContext(7);

      assert.equal(context.domain, "fitness");
      assert.equal(context.hasHistory, false);
      assert.equal(context.sessions.recentCount, 0);
      assert.equal(context.sessions.completionRate, null);
      assert.equal(context.progressSummary.hasProgressData, false);
      assert.equal(context.currentPlan.hasCurrentPlan, false);
      assert.deepEqual(context.profile.injuries, []);
    }
  );
});

test("fitness context caps issue summaries and session completion", async () => {
  const longIssue = "Knee discomfort ".repeat(20);

  await mockModelMethods(
    {
      "TraineeProfile.findOne": async () => ({
        goal: "muscle gain",
        level: "beginner",
        biologicalSex: "female",
        trainingDaysPerWeek: 3,
        equipmentAccess: ["gym"],
        injuries: ["knee discomfort"],
        limitations: [],
        specialtyPreferences: {
          coachIntake: {
            version: "coach_intake_v1",
            mainGoal: "hypertrophy",
            experience: "beginner",
            trainingArchetype: "female_beginner_balanced_lower_body_bias",
            priorityMuscleGroups: ["glutes", "hamstrings", "quads", "core"],
            maintenanceMuscleGroups: ["shoulders", "back", "chest"],
            avoidSpecialization: ["upper_body_width"],
            constraints: ["3_days_per_week"],
            coachingTone: "supportive_beginner",
            confidence: "medium"
          }
        }
      }),
      "WorkoutSession.findAll": async () => [
        { status: "completed", totalSets: 10, completedSets: 10 },
        { status: "active", totalSets: 12, completedSets: 6 }
      ],
      "SetLog.findAll": async () => [
        { exerciseId: 1, logDate: "2026-06-29" },
        { exerciseId: 2, logDate: "2026-06-28" },
        { exerciseId: 1, logDate: "2026-06-27" }
      ],
      "WorkoutIssue.findAll": async () =>
        Array.from({ length: 8 }, (_, index) => ({
          severity: index % 2 === 0 ? "medium" : "high",
          message: `${longIssue} ${index}`
        })),
      "WorkoutPlan.findOne": async () => ({
        planId: 42,
        goal: "muscle gain",
        level: "beginner",
        daysPerWeek: 3,
        durationMinutes: 45
      }),
      "WorkoutPlanExercise.findAll": async () => [{}, {}, {}]
    },
    async () => {
      const context = await buildFitnessCoachContext(7);

      assert.equal(context.hasHistory, true);
      assert.equal(context.sessions.recentCount, 2);
      assert.equal(context.sessions.completedCount, 1);
      assert.equal(context.sessions.averageSetCompletionPercent, 75);
      assert.equal(context.setLogs.distinctExercises, 2);
      assert.equal(context.progressSummary.hasProgressData, true);
      assert.equal(context.progressSummary.adherenceSummary.completionRate, 50);
      assert.ok(context.progressSummary.exerciseProgress.length >= 1);
      assert.equal(context.currentPlan.assignmentCount, 3);
      assert.equal(
        context.profile.coachIntake.trainingArchetype,
        "female_beginner_balanced_lower_body_bias"
      );
      assert.ok(context.profile.coachIntake.priorityMuscleGroups.includes("glutes"));
      assert.ok(context.issues.issueThemes.length <= 5);
      assert.ok(context.issues.issueThemes.length >= 1);
      assert.ok(context.issues.issueThemes.every((message) => message.length <= 90));
    }
  );
});

test("nutrition context summarizes averages, caution foods, and low confidence estimates", async () => {
  await mockModelMethods(
    {
      "NutritionProfile.findOne": async () => ({
        goal: "muscle gain",
        dailyCaloriesTarget: 2000,
        dailyProteinTarget: 100,
        dietaryPreferences: ["high protein"],
        allergies: ["milk"],
        medicalRestrictions: []
      }),
      "TraineeProfile.findOne": async () => ({
        injuries: ["shoulder"],
        limitations: ["avoid overhead pressing"]
      }),
      "NutritionLogItem.findAll": async () => [
        {
          consumedDate: "2026-06-29",
          foodName: "Protein Yogurt",
          calories: 500,
          protein: 40,
          evaluationStatus: "recommended",
          guidanceSource: "deterministic_quality",
          estimateConfidence: null
        },
        {
          consumedDate: "2026-06-29",
          foodName: "Chocolate Bar",
          calories: 500,
          protein: 10,
          evaluationStatus: "caution",
          guidanceSource: "deterministic_quality",
          estimateConfidence: null
        },
        {
          consumedDate: "2026-06-28",
          foodName: "Restaurant Meal",
          calories: 1500,
          protein: 120,
          evaluationStatus: "estimated",
          guidanceSource: "ai_estimate",
          estimateConfidence: "low"
        }
      ],
      "NutritionFavorite.findAll": async () => [
        { name: "Tuna", brand: "Brand A" },
        { name: "Rice", brand: null }
      ]
    },
    async () => {
      const context = await buildNutritionistContext(7);

      assert.equal(context.domain, "nutrition");
      assert.equal(context.hasHistory, true);
      assert.equal(context.recentLogging.loggedDayCount, 2);
      assert.equal(context.recentLogging.averageDailyCalories, 1250);
      assert.equal(context.recentLogging.averageDailyProtein, 85);
      assert.equal(context.recentLogging.averageCaloriesVsTargetPercent, 63);
      assert.equal(context.recentLogging.averageProteinVsTargetPercent, 85);
      assert.equal(context.guidancePatterns.cautionFoods[0].value, "Chocolate Bar");
      assert.equal(context.guidancePatterns.lowConfidenceEstimateCount, 1);
      assert.equal(context.favorites.length, 2);
      assert.deepEqual(context.profile.allergies, ["milk"]);
      assert.deepEqual(context.profile.profileLimitations, ["avoid overhead pressing"]);
    }
  );
});
