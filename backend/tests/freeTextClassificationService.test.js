const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createFreeTextClassifier,
  filterAllowedSignals,
  isUnsafeOrJunk,
  normalizeSignalPattern
} = require("../services/freeTextClassificationService");

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

// A minimal, deliberately non–check-in vocabulary to prove the engine is generic.
function demoVocabulary() {
  return {
    allowedSignals: new Set(["pain_signal", "focus_preference"]),
    parseTags(text) {
      const value = String(text || "").toLowerCase();
      const tags = [];
      if (value.includes("hurt") || value.includes("pain")) tags.push("pain_signal");
      if (value.includes("focus")) tags.push("focus_preference");
      return tags;
    },
    neutralValidPatterns: [/^it was fine$/i],
    irrelevantPatterns: [/you are the king/i],
    defaultLlmClassifier: async () => {
      throw new Error("default LLM should not be called in these tests");
    }
  };
}

test("shared helpers behave generically", () => {
  assert.equal(normalizeSignalPattern("Machine #12 was busy!!!"), "machine # was busy");
  assert.equal(isUnsafeOrJunk("run <script>alert(1)</script>"), true);
  assert.equal(isUnsafeOrJunk("my knee hurt during squats"), false);
  assert.deepEqual(
    filterAllowedSignals(["pain_signal", "not_allowed", "focus_preference"], new Set(["pain_signal"])),
    ["pain_signal"]
  );
});

test("deterministic tier classifies without touching the LLM", async () => {
  const classifier = createFreeTextClassifier(demoVocabulary());

  const actionable = await classifier.classifyText("my shoulder hurt");
  assert.equal(actionable.qualityCategory, "actionable");
  assert.deepEqual(actionable.signals, ["pain_signal"]);
  assert.equal(actionable.source, "deterministic");

  assert.equal((await classifier.classifyText("run <script>alert(1)</script>")).qualityCategory, "unsafe_or_junk");
  assert.equal((await classifier.classifyText("it was fine")).qualityCategory, "neutral_valid");
  assert.equal((await classifier.classifyText("you are the king")).qualityCategory, "irrelevant");
});

test("high-confidence LLM result is cached and a later match avoids another LLM call", async () => {
  const signalPatternModel = fakePatternModel();
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
  const classifier = createFreeTextClassifier(demoVocabulary());

  const first = await classifier.classifyText("Can we bias the posterior chain next week?", {
    signalPatternModel,
    llmClassifier
  });
  const second = await classifier.classifyText("posterior chain priority", {
    signalPatternModel,
    llmClassifier
  });

  assert.equal(llmCalls, 1);
  assert.equal(signalPatternModel.records.size, 1);
  assert.deepEqual(first.signals, ["focus_preference"]);
  assert.equal(second.source, "cache");
  assert.deepEqual(second.signals, ["focus_preference"]);
});

test("low-confidence LLM result is not cached", async () => {
  const signalPatternModel = fakePatternModel();
  const classifier = createFreeTextClassifier(demoVocabulary());

  const result = await classifier.classifyText("something felt slightly off", {
    signalPatternModel,
    llmClassifier: async () => ({
      qualityCategory: "needs_review",
      signals: [],
      confidenceLabel: "low",
      confidenceScore: 0.3,
      normalizedPattern: "something felt slightly off"
    })
  });

  assert.equal(result.qualityCategory, "needs_review");
  assert.equal(signalPatternModel.records.size, 0);
});

test("text with a known cue is caught deterministically before the LLM", async () => {
  const classifier = createFreeTextClassifier(demoVocabulary());
  let llmCalls = 0;

  const result = await classifier.classifyText("something focus related but novel wording", {
    signalPatternModel: fakePatternModel(),
    llmClassifier: async () => {
      llmCalls += 1;
      throw new Error("LLM should not be reached");
    }
  });

  assert.equal(result.source, "deterministic");
  assert.deepEqual(result.signals, ["focus_preference"]);
  assert.equal(llmCalls, 0);
});

test("LLM failure on cue-free text falls back to needs_review without crashing", async () => {
  const classifier = createFreeTextClassifier(demoVocabulary());

  const result = await classifier.classifyText("novel wording with no known cue", {
    signalPatternModel: fakePatternModel(),
    llmClassifier: async () => {
      throw new Error("LLM unavailable");
    }
  });

  assert.equal(result.qualityCategory, "needs_review");
  assert.equal(result.source, "fallback");
  assert.deepEqual(result.signals, []);
});

test("cacheScope isolates learned patterns across entry points", async () => {
  const signalPatternModel = fakePatternModel();
  const base = {
    allowedSignals: new Set(["pain_signal"]),
    parseTags: () => [],
    neutralValidPatterns: [],
    irrelevantPatterns: [],
    defaultLlmClassifier: async () => {
      throw new Error("no default llm");
    }
  };
  const scopedIssue = createFreeTextClassifier({ ...base, cacheScope: "live_issue" });
  const defaultCheckIn = createFreeTextClassifier({ ...base });
  const llmClassifier = async () => ({
    qualityCategory: "actionable",
    signals: ["pain_signal"],
    confidenceLabel: "high",
    confidenceScore: 0.9,
    normalizedPattern: "shared phrase"
  });

  const stored = await scopedIssue.classifyText("shared phrase", { signalPatternModel, llmClassifier });
  assert.deepEqual(stored.signals, ["pain_signal"]);
  assert.equal(Array.from(signalPatternModel.records.values())[0].scope, "live_issue");

  // A different scope must NOT read the issue-scoped entry -> it falls through to its own LLM.
  let checkInLlmCalls = 0;
  await defaultCheckIn.classifyText("shared phrase", {
    signalPatternModel,
    llmClassifier: async () => {
      checkInLlmCalls += 1;
      return { qualityCategory: "actionable", signals: ["pain_signal"], confidenceLabel: "high", confidenceScore: 0.9, normalizedPattern: "shared phrase" };
    }
  });
  assert.equal(checkInLlmCalls, 1);
});

test("admin listing formats records and filters to the vocabulary signal set", async () => {
  const signalPatternModel = fakePatternModel();
  signalPatternModel.records.set("hash", {
    patternId: 1,
    normalizedPattern: "posterior chain priority",
    patternHash: "hash",
    language: "en",
    qualityCategory: "actionable",
    signals: ["focus_preference", "not_in_vocabulary"],
    confidenceScore: 0.9,
    confidenceLabel: "high",
    source: "llm",
    hitCount: 3,
    status: "active"
  });
  const classifier = createFreeTextClassifier(demoVocabulary());

  const rows = await classifier.listSignalPatterns({ signalPatternModel });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].signals, ["focus_preference"]);
  assert.equal(rows[0].patternHash, undefined);

  const disabled = await classifier.disableSignalPattern(1, { signalPatternModel });
  assert.equal(disabled.status, "disabled");
});
