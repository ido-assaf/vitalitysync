const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AiSpecialist,
  AiSpecialistSignalPattern,
  SetLog,
  TraineeProfile,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession
} = require("../models");
const workoutPlansController = require("../controllers/workoutPlansController");

const coach = {
  specialistId: 1,
  name: "Fitness Coach",
  type: "fitness",
  specialty: "strength training",
  status: "active",
  availabilityStatus: "available",
  toJSON() {
    return {
      specialistId: 1,
      name: "Fitness Coach",
      type: "fitness",
      specialty: "strength training",
      status: "active"
    };
  }
};

function profile(overrides = {}) {
  return {
    userId: 7,
    goal: "muscle gain",
    level: "beginner",
    biologicalSex: "female",
    trainingDaysPerWeek: 3,
    equipmentAccess: ["gym"],
    injuries: [],
    limitations: [],
    likedExercises: [],
    dislikedExercises: [],
    specialtyPreferences: {},
    ...overrides
  };
}

function mockModelMethods(overrides, run) {
  const models = {
    AiSpecialist,
    AiSpecialistSignalPattern,
    SetLog,
    TraineeProfile,
    WorkoutIssue,
    WorkoutPlan,
    WorkoutPlanExercise,
    WorkoutSession
  };
  const originals = [];

  Object.entries(overrides).forEach(([key, value]) => {
    const [modelName, methodName] = key.split(".");
    const model = models[modelName];

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

function responseRecorder(resolve) {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      resolve(this);
      return this;
    }
  };
}

function callWeeklyReview(body) {
  return new Promise((resolve, reject) => {
    const req = { body };
    const res = responseRecorder(resolve);

    workoutPlansController.getWeeklyFitnessReview(req, res, (error) => {
      reject(error);
    });
  });
}

function callWeeklyCheckIn(body) {
  return new Promise((resolve, reject) => {
    const req = { body };
    const res = responseRecorder(resolve);

    workoutPlansController.submitWeeklyFitnessCheckIn(req, res, (error) => {
      reject(error);
    });
  });
}

function noHistoryMocks(profileValue = profile()) {
  return {
    "TraineeProfile.findOne": async () => profileValue,
    "AiSpecialist.findOne": async () => coach,
    "WorkoutSession.findAll": async () => [],
    "SetLog.findAll": async () => [],
    "WorkoutIssue.findAll": async () => [],
    "WorkoutPlan.findOne": async () => null,
    "WorkoutPlanExercise.findAll": async () => []
  };
}

test("weekly fitness review rejects invalid userId", async () => {
  const res = await callWeeklyReview({ userId: "bad" });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("weekly fitness review returns not found for missing profile", async () => {
  await mockModelMethods(
    {
      "TraineeProfile.findOne": async () => null
    },
    async () => {
      const res = await callWeeklyReview({ userId: 7 });

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "NOT_FOUND");
    }
  );
});

test("weekly fitness review returns collect more data for profile without history", async () => {
  await mockModelMethods(noHistoryMocks(), async () => {
    const res = await callWeeklyReview({ userId: 7 });
    const data = res.body.data;

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(data.reviewDecision, "collect_more_data");
    assert.equal(data.confidence, "low");
    assert.ok(data.headline.includes("Keep logging"));
    assert.deepEqual(data.reviewActions, []);
    assert.equal(data.coachNote, "Keep logging this week so the coach can read the trend.");
    assert.equal(Object.prototype.hasOwnProperty.call(data, "progressSummary"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "adaptationDecisions"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "planUpdateProposal"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "professionalRecommendations"), false);
  });
});

test("weekly fitness review exposes low adherence simplification brief", async () => {
  await mockModelMethods(
    {
      ...noHistoryMocks(),
      "WorkoutSession.findAll": async () => [
        { status: "completed", totalSets: 12, completedSets: 12 },
        { status: "missed", totalSets: 12, completedSets: 0 },
        { status: "active", totalSets: 12, completedSets: 4 },
        { status: "missed", totalSets: 12, completedSets: 0 }
      ]
    },
    async () => {
      const res = await callWeeklyReview({ userId: 7 });
      const data = res.body.data;

      assert.equal(res.statusCode, 200);
      assert.equal(data.reviewDecision, "minor_adjustments");
      assert.equal(data.recommendedNextStep, "Simplify the week and avoid increasing volume.");
      assert.ok(data.keyFindings.some((finding) => finding.includes("simplify")));
      assert.ok(data.keyFindings.some((finding) => finding.includes("Volume increase rejected")));
      assert.ok(data.reasonCodes.includes("low_adherence"));
      assert.equal(data.reviewActions[0].type, "simplify_session");
      assert.equal(data.reviewActions[0].status, "preview_only");
      assert.equal(data.coachNote, "These are review suggestions, not automatic plan changes.");
    }
  );
});

test("weekly fitness review exposes recurring pain needs-review brief", async () => {
  await mockModelMethods(
    {
      ...noHistoryMocks(profile({ injuries: ["knee pain"] })),
      "WorkoutIssue.findAll": async () => [
        { message: "knee pain on lunges", severity: "medium" },
        { message: "knee pain on lunges", severity: "medium" }
      ]
    },
    async () => {
      const res = await callWeeklyReview({ userId: 7 });
      const data = res.body.data;

      assert.equal(res.statusCode, 200);
      assert.equal(data.reviewDecision, "needs_review");
      assert.ok(data.safetyNotes.includes("Do not progress painful movements until reviewed."));
      assert.ok(data.reasonCodes.includes("recurring_pain"));
      assert.equal(data.reviewActions[0].type, "review_substitution_candidate");
      assert.equal(data.reviewActions[0].priority, 1);
      assert.equal(Object.prototype.hasOwnProperty.call(data, "progressSummary"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(data, "adaptationDecisions"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(data, "planUpdateProposal"), false);
    }
  );
});

test("weekly fitness review uses stored recurring check-in pain after refresh", async () => {
  await mockModelMethods(
    noHistoryMocks(
      profile({
        specialtyPreferences: {
          weeklyCheckIns: [
            {
              submittedAt: "2026-07-01T10:00:00.000Z",
              parsedSignals: ["pain_signal"],
              answers: []
            },
            {
              submittedAt: "2026-07-08T10:00:00.000Z",
              parsedSignals: ["pain_signal"],
              answers: []
            }
          ]
        }
      })
    ),
    async () => {
      const res = await callWeeklyReview({ userId: 7 });
      const data = res.body.data;

      assert.equal(res.statusCode, 200);
      assert.equal(data.reviewDecision, "needs_review");
      assert.ok(data.reasonCodes.includes("recurring_check_in_pain"));
      assert.ok(data.reasonCodes.includes("recurring_pain"));
      assert.ok(data.safetyNotes.includes("Do not progress painful movements until reviewed."));
    }
  );
});

test("weekly fitness check-in rejects invalid userId", async () => {
  const res = await callWeeklyCheckIn({
    userId: "bad",
    answers: [{ question: "What happened?", answer: "No time" }]
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("weekly fitness check-in returns not found for missing profile", async () => {
  await mockModelMethods(
    {
      "TraineeProfile.findOne": async () => null
    },
    async () => {
      const res = await callWeeklyCheckIn({
        userId: 7,
        answers: [{ question: "What happened?", answer: "No time" }]
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "NOT_FOUND");
    }
  );
});

test("weekly fitness check-in validates answer count and text limits", async () => {
  await mockModelMethods(
    {
      "TraineeProfile.findOne": async () => profile()
    },
    async () => {
      const tooMany = await callWeeklyCheckIn({
        userId: 7,
        answers: [
          { answer: "one" },
          { answer: "two" },
          { answer: "three" },
          { answer: "four" }
        ]
      });
      const blank = await callWeeklyCheckIn({
        userId: 7,
        answers: [{ question: "What happened?", answer: "   " }]
      });
      const longAnswer = await callWeeklyCheckIn({
        userId: 7,
        answers: [{ question: "What happened?", answer: "a".repeat(301) }]
      });
      const longQuestion = await callWeeklyCheckIn({
        userId: 7,
        answers: [{ question: "q".repeat(181), answer: "valid answer" }]
      });

      assert.equal(tooMany.statusCode, 400);
      assert.equal(blank.statusCode, 400);
      assert.equal(longAnswer.statusCode, 400);
      assert.equal(longQuestion.statusCode, 400);
      assert.ok(blank.body.error.details["answers.0.answer"]);
      assert.ok(longAnswer.body.error.details["answers.0.answer"]);
      assert.ok(longQuestion.body.error.details["answers.0.question"]);
    }
  );
});

test("weekly fitness check-in returns parsed signals and compact preview only", async () => {
  await mockModelMethods(noHistoryMocks(), async () => {
    const res = await callWeeklyCheckIn({
      userId: 7,
      answers: [
        {
          question: "What made sessions hard to complete: time, fatigue, difficulty, or motivation?",
          answer: "No time because work was busy and I was tired"
        }
      ]
    });
    const data = res.body.data;

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(data.received, true);
    assert.equal(data.version, "fitness_weekly_check_in_v0.2");
    assert.deepEqual(data.parsedSignals, ["time_constraint", "fatigue_signal"]);
    assert.deepEqual(data.answers[0].tags, ["time_constraint", "fatigue_signal"]);
    assert.equal(data.message, "Coach will use this for next week.");
    assert.equal(data.usableAnswerCount, 1);
    assert.equal(data.historyCount, 1);
    assert.deepEqual(data.recurrenceSignals, []);
    assert.equal(data.preview.reviewDecision, "minor_adjustments");
    assert.ok(data.preview.reasonCodes.includes("time_constraint"));
    assert.ok(data.preview.reasonCodes.includes("fatigue_signal"));
    assert.ok(data.preview.reasonCodes.includes("recovery_risk"));
    assert.equal(data.preview.recommendedNextStep, "Simplify the week and avoid increasing volume.");
    assert.ok(data.preview.reviewActions.some((action) => action.type === "reduce_load_or_volume"));
    assert.equal(data.preview.coachNote, "These are review suggestions, not automatic plan changes.");
    assert.ok(Array.isArray(data.preview.coachQuestions));
    assert.equal(Object.prototype.hasOwnProperty.call(data, "progressSummary"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "adaptationDecisions"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "planUpdateProposal"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data.preview, "progressSummary"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data.preview, "adaptationDecisions"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data.preview, "planUpdateProposal"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data.preview, "professionalRecommendations"), false);
  });
});

test("weekly fitness check-in accepts general note and selected tags", async () => {
  const savedProfile = profile({
    specialtyPreferences: {},
    async update(payload) {
      this.specialtyPreferences = payload.specialtyPreferences;
    }
  });

  await mockModelMethods(noHistoryMocks(savedProfile), async () => {
    const res = await callWeeklyCheckIn({
      userId: 7,
      generalNote: "The machine was occupied",
      selectedTags: ["too_hard"]
    });
    const data = res.body.data;
    const weeklyCheckIns = savedProfile.specialtyPreferences.weeklyCheckIns;

    assert.equal(res.statusCode, 200);
    assert.deepEqual(data.parsedSignals, ["equipment_unavailable", "too_hard"]);
    assert.equal(data.usableAnswerCount, 2);
    assert.deepEqual(data.selectedTags, ["too_hard"]);
    assert.equal(weeklyCheckIns.length, 1);
    assert.equal(weeklyCheckIns[0].generalNote.text, "The machine was occupied");
    assert.deepEqual(weeklyCheckIns[0].selectedTags, ["too_hard"]);
    assert.equal(Object.prototype.hasOwnProperty.call(weeklyCheckIns[0], "userId"), false);
  });
});

test("weekly fitness check-in with irrelevant content does not create review signals", async () => {
  await mockModelMethods(noHistoryMocks(), async () => {
    const res = await callWeeklyCheckIn({
      userId: 7,
      generalNote: "you are the king"
    });
    const data = res.body.data;

    assert.equal(res.statusCode, 200);
    assert.deepEqual(data.parsedSignals, []);
    assert.equal(data.usableAnswerCount, 0);
    assert.equal(data.answerQuality[0].category, "irrelevant");
    assert.deepEqual(data.recurrenceSignals, []);
    assert.ok(!data.preview.reasonCodes.includes("pain_signal"));
    assert.ok(!data.preview.reasonCodes.includes("fatigue_signal"));
    assert.ok(!data.preview.reasonCodes.includes("low_adherence"));
  });
});

test("weekly fitness check-in cache hit influences preview through extracted signals only", async () => {
  await mockModelMethods(
    {
      ...noHistoryMocks(),
      "AiSpecialistSignalPattern.findOne": async () => ({
        toJSON() {
          return {
            qualityCategory: "actionable",
            signals: ["pain_signal"],
            confidenceLabel: "high",
            confidenceScore: 0.9,
            hitCount: 0
          };
        },
        async update() {}
      })
    },
    async () => {
      const res = await callWeeklyCheckIn({
        userId: 7,
        generalNote: "bar path felt spicy"
      });
      const data = res.body.data;

      assert.equal(res.statusCode, 200);
      assert.deepEqual(data.parsedSignals, ["pain_signal"]);
      assert.equal(data.preview.reviewDecision, "needs_review");
      assert.ok(data.preview.reasonCodes.includes("pain_signal"));
      assert.equal(Object.prototype.hasOwnProperty.call(data, "cacheHit"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(data, "llm"), false);
    }
  );
});

test("weekly fitness check-in persists bounded history and returns recurrence signals", async () => {
  const savedProfile = profile({
    specialtyPreferences: {
      weeklyCheckIns: [
        {
          submittedAt: "2026-07-01T10:00:00.000Z",
          parsedSignals: ["pain_signal"],
          answers: []
        }
      ]
    },
    async update(payload) {
      this.specialtyPreferences = payload.specialtyPreferences;
    }
  });

  await mockModelMethods(noHistoryMocks(savedProfile), async () => {
    const res = await callWeeklyCheckIn({
      userId: 7,
      answers: [
        {
          question: "Which movement caused pain?",
          answer: "knee pain on lunges"
        }
      ]
    });
    const data = res.body.data;
    const weeklyCheckIns = savedProfile.specialtyPreferences.weeklyCheckIns;

    assert.equal(res.statusCode, 200);
    assert.equal(data.historyCount, 2);
    assert.deepEqual(data.recurrenceSignals, ["recurring_check_in_pain"]);
    assert.equal(data.preview.reviewDecision, "needs_review");
    assert.ok(data.preview.reasonCodes.includes("recurring_check_in_pain"));
    assert.equal(data.preview.reviewActions[0].type, "review_substitution_candidate");
    assert.equal(weeklyCheckIns.length, 2);
    assert.equal(weeklyCheckIns[1].version, "fitness_weekly_check_in_v0.2");
    assert.deepEqual(weeklyCheckIns[1].parsedSignals, ["pain_signal"]);
    assert.equal(weeklyCheckIns[1].previewSummary.reviewDecision, "needs_review");
    assert.equal(Object.prototype.hasOwnProperty.call(weeklyCheckIns[1].previewSummary, "planUpdateProposal"), false);
  });
});
