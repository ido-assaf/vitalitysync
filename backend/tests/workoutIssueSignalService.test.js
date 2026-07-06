const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_CLASSIFIED_ISSUES_PER_SESSION,
  classifyAndAttachWorkoutIssueSignals,
  parseWorkoutIssueTags
} = require("../services/workoutIssueSignalService");

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
        .sort((left, right) => Number(right.hitCount || 0) - Number(left.hitCount || 0));
      return rows.slice(0, limit || rows.length).map(wrap);
    },
    async findByPk() {
      return null;
    }
  };
}

function fakeIssue({ issueId = 1, workoutSessionId = 10, message }) {
  return {
    issueId,
    workoutSessionId,
    message,
    signals: null,
    async update(payload) {
      Object.assign(this, payload);
      return this;
    }
  };
}

function fakeWorkoutIssueModel(classifiedCount = 0) {
  return {
    async count() {
      return classifiedCount;
    }
  };
}

test("parseWorkoutIssueTags keeps only the in-workout subset (he/en)", () => {
  assert.deepEqual(parseWorkoutIssueTags("the machine was occupied"), ["equipment_unavailable"]);
  assert.deepEqual(parseWorkoutIssueTags("כאב לי בברך"), ["pain_signal"]);
  assert.deepEqual(parseWorkoutIssueTags("the weight was too hard and heavy"), ["too_hard"]);
  // time_constraint exists in the check-in vocabulary but is not an in-workout signal.
  assert.deepEqual(parseWorkoutIssueTags("I had no time because work was busy"), []);
});

test("deterministic issue text is classified and attached without the LLM", async () => {
  const issue = fakeIssue({ message: "the machine was occupied" });
  let llmCalls = 0;

  const result = await classifyAndAttachWorkoutIssueSignals(issue, {
    workoutIssueModel: fakeWorkoutIssueModel(0),
    signalPatternModel: fakePatternModel(),
    llmClassifier: async () => {
      llmCalls += 1;
      throw new Error("LLM should not be called for deterministic text");
    }
  });

  assert.deepEqual(result.signals, ["equipment_unavailable"]);
  assert.deepEqual(issue.signals, ["equipment_unavailable"]);
  assert.equal(llmCalls, 0);
});

test("irrelevant issue text is marked classified with no signals and emits nothing", async () => {
  const issue = fakeIssue({ message: "you are the king" });

  const result = await classifyAndAttachWorkoutIssueSignals(issue, {
    workoutIssueModel: fakeWorkoutIssueModel(0),
    signalPatternModel: fakePatternModel()
  });

  assert.equal(result, null);
  assert.deepEqual(issue.signals, []);
});

test("per-session cap skips classification entirely after the limit", async () => {
  const issue = fakeIssue({ message: "some new phrasing with no known cue" });
  let llmCalls = 0;

  const result = await classifyAndAttachWorkoutIssueSignals(issue, {
    workoutIssueModel: fakeWorkoutIssueModel(MAX_CLASSIFIED_ISSUES_PER_SESSION),
    signalPatternModel: fakePatternModel(),
    llmClassifier: async () => {
      llmCalls += 1;
      return { qualityCategory: "actionable", signals: ["pain_signal"], confidenceLabel: "high", confidenceScore: 0.9 };
    }
  });

  assert.equal(result, null);
  assert.equal(issue.signals, null); // never classified
  assert.equal(llmCalls, 0);
});

test("LLM path stores under the live_issue scope and a later normalized match hits cache", async () => {
  const signalPatternModel = fakePatternModel();
  let llmCalls = 0;
  const llmClassifier = async () => {
    llmCalls += 1;
    return {
      qualityCategory: "actionable",
      signals: ["equipment_unavailable"],
      confidenceLabel: "high",
      confidenceScore: 0.9,
      normalizedPattern: "setup felt off"
    };
  };

  const first = await classifyAndAttachWorkoutIssueSignals(
    fakeIssue({ issueId: 1, message: "the setup felt strange and off today" }),
    { workoutIssueModel: fakeWorkoutIssueModel(0), signalPatternModel, llmClassifier }
  );
  const second = await classifyAndAttachWorkoutIssueSignals(
    fakeIssue({ issueId: 2, message: "setup felt off" }),
    { workoutIssueModel: fakeWorkoutIssueModel(1), signalPatternModel, llmClassifier }
  );

  assert.equal(llmCalls, 1);
  assert.equal(signalPatternModel.records.size, 1);
  assert.equal(Array.from(signalPatternModel.records.values())[0].scope, "live_issue");
  assert.deepEqual(first.signals, ["equipment_unavailable"]);
  assert.deepEqual(second.signals, ["equipment_unavailable"]);
});

test("LLM failure keeps the issue flow intact (no throw, no signals)", async () => {
  const issue = fakeIssue({ message: "some new phrasing with no known cue" });

  const result = await classifyAndAttachWorkoutIssueSignals(issue, {
    workoutIssueModel: fakeWorkoutIssueModel(0),
    signalPatternModel: fakePatternModel(),
    llmClassifier: async () => {
      throw new Error("LLM unavailable");
    }
  });

  assert.equal(result, null);
  assert.deepEqual(issue.signals, []);
});
