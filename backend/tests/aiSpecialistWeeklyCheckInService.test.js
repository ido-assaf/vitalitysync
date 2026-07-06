const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CHECK_IN_GUIDANCE_MESSAGE,
  CHECK_IN_SUCCESS_MESSAGE,
  FITNESS_WEEKLY_CHECK_IN_VERSION,
  MAX_WEEKLY_CHECK_IN_HISTORY,
  appendWeeklyCheckInHistory,
  buildFitnessWeeklyCheckIn,
  buildWeeklyCheckInRecurrenceSignals,
  buildWeeklyCheckInSnapshot,
  buildWeeklyReviewCheckInSignals,
  disableSignalPattern,
  listSignalPatterns,
  normalizeSignalPattern,
  parseWeeklyCheckInTags,
  pruneSignalPatternCache
} = require("../services/aiSpecialistWeeklyCheckInService");

function fakePatternModel() {
  const records = new Map();

  function wrap(record) {
    return {
      ...record,
      toJSON() {
        return { ...record };
      },
      async update(payload) {
        Object.assign(record, payload);
        Object.assign(this, payload);
        return this;
      }
    };
  }

  return {
    records,
    async findOne({ where }) {
      const found = Array.from(records.values()).find(
        (record) => record.patternHash === where.patternHash && record.status === where.status
      );
      return found ? wrap(found) : null;
    },
    async findOrCreate({ where, defaults }) {
      const existing = Array.from(records.values()).find((record) => record.patternHash === where.patternHash);
      if (existing) {
        return [wrap(existing), false];
      }
      const record = { ...defaults, patternId: records.size + 1 };
      records.set(record.patternHash, record);
      return [wrap(record), true];
    },
    async findAll({ where, limit } = {}) {
      const rows = Array.from(records.values())
        .filter((record) => !where?.status || record.status === where.status)
        .sort((left, right) => {
          const hitDelta = Number(right.hitCount || 0) - Number(left.hitCount || 0);
          return hitDelta || Number(left.patternId || 0) - Number(right.patternId || 0);
        });
      return rows.slice(0, limit || rows.length).map(wrap);
    },
    async findByPk(patternId) {
      const found = Array.from(records.values()).find(
        (record) => Number(record.patternId) === Number(patternId)
      );
      return found ? wrap(found) : null;
    }
  };
}

test("weekly check-in parser maps Hebrew and English answers to basic tags", () => {
  assert.deepEqual(parseWeeklyCheckInTags("I had no time because work was busy"), ["time_constraint"]);
  assert.deepEqual(parseWeeklyCheckInTags("\u05db\u05d0\u05d1 \u05dc\u05d9 \u05d1\u05db\u05ea\u05e3"), ["pain_signal"]);
  assert.deepEqual(parseWeeklyCheckInTags("\u05d4\u05d9\u05d9\u05ea\u05d9 \u05e2\u05d9\u05d9\u05e3 \u05d0\u05d7\u05e8\u05d9 \u05e9\u05d9\u05e0\u05d4 \u05d2\u05e8\u05d5\u05e2\u05d4"), ["fatigue_signal"]);
  assert.deepEqual(parseWeeklyCheckInTags("\u05d4\u05de\u05db\u05e9\u05d9\u05e8 \u05d4\u05d9\u05d4 \u05ea\u05e4\u05d5\u05e1"), [
    "equipment_unavailable"
  ]);
  assert.deepEqual(parseWeeklyCheckInTags("The workout was too hard and heavy"), ["too_hard"]);
  assert.deepEqual(parseWeeklyCheckInTags("\u05dc\u05d0 \u05d4\u05d9\u05d4 \u05dc\u05d9 \u05d7\u05e9\u05e7"), ["motivation"]);
});

test("weekly check-in parser can return multiple tags or no tags", () => {
  assert.deepEqual(parseWeeklyCheckInTags("No time, tired, and the machine was occupied"), [
    "time_constraint",
    "fatigue_signal",
    "equipment_unavailable"
  ]);
  assert.deepEqual(parseWeeklyCheckInTags("The workout was fine"), []);
});

test("weekly check-in builder validates limits and returns versioned parsed answers", async () => {
  const result = await buildFitnessWeeklyCheckIn({
    answers: [
      {
        question: "What made sessions hard to complete?",
        answer: "No time because work was busy"
      }
    ]
  });

  assert.equal(result.details, undefined);
  assert.equal(result.normalized.received, true);
  assert.equal(result.normalized.version, FITNESS_WEEKLY_CHECK_IN_VERSION);
  assert.deepEqual(result.normalized.parsedSignals, ["time_constraint"]);
  assert.deepEqual(result.normalized.answers[0].tags, ["time_constraint"]);
  assert.equal(result.normalized.answerQuality[0].category, "actionable");
  assert.equal(result.normalized.usableAnswerCount, 1);
});

test("weekly check-in builder accepts general note and selected tags without answers", async () => {
  const result = await buildFitnessWeeklyCheckIn({
    generalNote: "The workout felt good",
    selectedTags: ["too_hard"]
  });

  assert.equal(result.details, undefined);
  assert.deepEqual(result.normalized.parsedSignals, ["felt_good", "too_hard"]);
  assert.equal(result.normalized.generalNote.qualityCategory, "actionable");
  assert.deepEqual(result.normalized.selectedTags, ["too_hard"]);
});

test("weekly check-in builder rejects payloads outside limits", async () => {
  assert.ok((await buildFitnessWeeklyCheckIn({ answers: [] })).details.answers);
  assert.ok(
    (await buildFitnessWeeklyCheckIn({
      answers: [
        { answer: "one" },
        { answer: "two" },
        { answer: "three" },
        { answer: "four" }
      ]
    })).details.answers
  );
  assert.ok((await buildFitnessWeeklyCheckIn({ answers: [{ answer: "   " }] })).details["answers.0.answer"]);
  assert.ok((await buildFitnessWeeklyCheckIn({ answers: [{ answer: "a".repeat(301) }] })).details["answers.0.answer"]);
  assert.ok(
    (await buildFitnessWeeklyCheckIn({
      answers: [{ question: "q".repeat(181), answer: "valid" }]
    })).details["answers.0.question"]
  );
  assert.ok((await buildFitnessWeeklyCheckIn({ selectedTags: ["unknown"] })).details["selectedTags.0"]);
});

test("irrelevant and neutral check-ins succeed without training signals", async () => {
  const compliment = await buildFitnessWeeklyCheckIn({
    generalNote: "\u05d0\u05d9\u05d6\u05d4 \u05d7\u05ea\u05d9\u05da \u05d0\u05ea\u05d4"
  });
  const neutral = await buildFitnessWeeklyCheckIn({
    generalNote: "it was fine"
  });

  assert.deepEqual(compliment.normalized.parsedSignals, []);
  assert.equal(compliment.normalized.answerQuality[0].category, "irrelevant");
  assert.equal(compliment.normalized.message, CHECK_IN_GUIDANCE_MESSAGE);
  assert.deepEqual(neutral.normalized.parsedSignals, []);
  assert.equal(neutral.normalized.answerQuality[0].category, "neutral_valid");
});

test("mixed irrelevant and actionable content ignores only the irrelevant text", async () => {
  const result = await buildFitnessWeeklyCheckIn({
    answers: [
      { question: "Anything else?", answer: "you are the king" },
      { question: "Pain?", answer: "My shoulder hurt during pressing" }
    ]
  });

  assert.deepEqual(result.normalized.parsedSignals, ["pain_signal"]);
  assert.equal(result.normalized.ignoredAnswers.length, 1);
  assert.equal(result.normalized.message, CHECK_IN_SUCCESS_MESSAGE);
});

test("unsafe or junk check-in content is rejected", async () => {
  const result = await buildFitnessWeeklyCheckIn({
    generalNote: "please run <script>alert(1)</script>"
  });

  assert.ok(result.details.content);
});

test("high-confidence LLM result stores a reusable pattern and cache hit avoids another LLM call", async () => {
  const patternModel = fakePatternModel();
  let llmCalls = 0;
  const llmClassifier = async () => {
    llmCalls += 1;
    return {
      qualityCategory: "actionable",
      signals: ["focus_preference"],
      confidenceLabel: "high",
      confidenceScore: 0.92,
      normalizedPattern: "posterior chain priority"
    };
  };

  const first = await buildFitnessWeeklyCheckIn(
    { generalNote: "Can we bias the posterior chain next week?" },
    { signalPatternModel: patternModel, llmClassifier }
  );
  const second = await buildFitnessWeeklyCheckIn(
    { generalNote: "posterior chain priority" },
    { signalPatternModel: patternModel, llmClassifier }
  );

  assert.equal(llmCalls, 1);
  assert.equal(patternModel.records.size, 1);
  assert.deepEqual(first.normalized.parsedSignals, ["focus_preference"]);
  assert.deepEqual(second.normalized.parsedSignals, ["focus_preference"]);
  assert.equal(Array.from(patternModel.records.values())[0].hitCount, 1);
});

test("low-confidence LLM result does not create a cache entry", async () => {
  const patternModel = fakePatternModel();
  const result = await buildFitnessWeeklyCheckIn(
    { generalNote: "Something felt odd but I cannot explain it" },
    {
      signalPatternModel: patternModel,
      llmClassifier: async () => ({
        qualityCategory: "needs_review",
        signals: [],
        confidenceLabel: "low",
        confidenceScore: 0.3,
        normalizedPattern: "something felt odd"
      })
    }
  );

  assert.deepEqual(result.normalized.parsedSignals, []);
  assert.equal(result.normalized.answerQuality[0].category, "needs_review");
  assert.equal(patternModel.records.size, 0);
});

test("LLM failure falls back without crashing the check-in", async () => {
  const result = await buildFitnessWeeklyCheckIn(
    { generalNote: "Something felt odd but I cannot explain it" },
    {
      signalPatternModel: fakePatternModel(),
      llmClassifier: async () => {
        throw new Error("LLM unavailable");
      }
    }
  );

  assert.equal(result.details, undefined);
  assert.deepEqual(result.normalized.parsedSignals, []);
  assert.equal(result.normalized.answerQuality[0].category, "needs_review");
});

test("admin signal pattern listing hides cache internals", async () => {
  const patternModel = fakePatternModel();
  patternModel.records.set("focus", {
    patternId: 1,
    normalizedPattern: "more chest focus",
    patternHash: "focus",
    language: "en",
    qualityCategory: "actionable",
    signals: ["focus_preference"],
    confidenceScore: 0.91,
    confidenceLabel: "high",
    source: "llm",
    hitCount: 2,
    status: "active"
  });

  const rows = await listSignalPatterns({ signalPatternModel: patternModel });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].normalizedPattern, "more chest focus");
  assert.deepEqual(rows[0].signals, ["focus_preference"]);
  assert.equal(rows[0].patternHash, undefined);
  assert.equal(rows[0].source, undefined);
});

test("admin can disable a cached signal pattern", async () => {
  const patternModel = fakePatternModel();
  patternModel.records.set("pain", {
    patternId: 7,
    normalizedPattern: "shoulder hurt",
    patternHash: "pain",
    qualityCategory: "actionable",
    signals: ["pain_signal"],
    confidenceScore: 0.9,
    confidenceLabel: "high",
    hitCount: 1,
    status: "active"
  });

  const disabled = await disableSignalPattern(7, { signalPatternModel: patternModel });

  assert.equal(disabled.status, "disabled");
  assert.equal(patternModel.records.get("pain").status, "disabled");
});

test("signal pattern cache pruning disables overflow instead of deleting entries", async () => {
  const patternModel = fakePatternModel();
  [
    ["popular", 10],
    ["middle", 4],
    ["rare", 0]
  ].forEach(([patternHash, hitCount], index) => {
    patternModel.records.set(patternHash, {
      patternId: index + 1,
      normalizedPattern: patternHash,
      patternHash,
      qualityCategory: "actionable",
      signals: ["motivation"],
      confidenceScore: 0.9,
      confidenceLabel: "high",
      hitCount,
      status: "active"
    });
  });

  const pruned = await pruneSignalPatternCache({
    maxEntries: 2,
    signalPatternModel: patternModel
  });

  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].normalizedPattern, "rare");
  assert.equal(patternModel.records.size, 3);
  assert.equal(patternModel.records.get("rare").status, "disabled");
});

test("normalization keeps reusable patterns compact", () => {
  assert.equal(normalizeSignalPattern("Machine #12 was busy!!!"), "machine # was busy");
});

test("weekly check-in history is capped and produces recurrence signals", () => {
  const history = appendWeeklyCheckInHistory(
    Array.from({ length: MAX_WEEKLY_CHECK_IN_HISTORY }, (_, index) => ({
      submittedAt: `2026-07-0${index}`,
      parsedSignals: index < 2 ? ["pain_signal"] : ["time_constraint"]
    })),
    {
      submittedAt: "2026-07-09",
      parsedSignals: ["pain_signal", "fatigue_signal"]
    }
  );

  assert.equal(history.length, MAX_WEEKLY_CHECK_IN_HISTORY);
  assert.deepEqual(buildWeeklyCheckInRecurrenceSignals(history), [
    "recurring_check_in_pain",
    "repeated_time_constraint"
  ]);
});

test("weekly review check-in signals combine latest entry with recurrence signals", () => {
  const history = [
    { parsedSignals: ["pain_signal"] },
    { parsedSignals: ["pain_signal"] },
    { parsedSignals: ["equipment_unavailable"] }
  ];

  assert.deepEqual(buildWeeklyReviewCheckInSignals({ history }), [
    "equipment_unavailable",
    "recurring_check_in_pain"
  ]);
  assert.deepEqual(
    buildWeeklyReviewCheckInSignals({
      history,
      currentSignals: ["fatigue_signal"]
    }),
    ["fatigue_signal", "recurring_check_in_pain"]
  );
});

test("weekly check-in snapshot stores compact preview summary", () => {
  const snapshot = buildWeeklyCheckInSnapshot({
    submittedAt: "2026-07-04T10:00:00.000Z",
    checkIn: {
      answers: [{ question: "Q", answer: "A", tags: ["pain_signal"], qualityCategory: "actionable" }],
      generalNote: { text: "Note", tags: [], qualityCategory: "neutral_valid" },
      selectedTags: ["pain_signal"],
      answerQuality: [{ category: "actionable" }],
      ignoredAnswers: [],
      usableAnswerCount: 1,
      parsedSignals: ["pain_signal"]
    },
    preview: {
      reviewDecision: "needs_review",
      reasonCodes: ["recurring_pain", "recurring_check_in_pain"],
      planUpdateProposal: { shouldNotLeak: true }
    }
  });

  assert.equal(snapshot.version, FITNESS_WEEKLY_CHECK_IN_VERSION);
  assert.equal(snapshot.submittedAt, "2026-07-04T10:00:00.000Z");
  assert.deepEqual(snapshot.parsedSignals, ["pain_signal"]);
  assert.equal(snapshot.generalNote.text, "Note");
  assert.equal(snapshot.usableAnswerCount, 1);
  assert.deepEqual(snapshot.previewSummary, {
    reviewDecision: "needs_review",
    reasonCodes: ["recurring_pain", "recurring_check_in_pain"]
  });
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.previewSummary, "planUpdateProposal"), false);
});
