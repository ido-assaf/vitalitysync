const test = require("node:test");
const assert = require("node:assert/strict");
const {
  COACHING_RULE_SOURCE_ID,
  FITNESS_KNOWLEDGE_BASE_VERSION,
  FITNESS_KNOWLEDGE_ITEMS,
  PROFESSIONAL_RULES,
  PROFESSIONAL_SOURCE_ITEMS,
  SOURCE_URLS
} = require("../services/aiSpecialistKnowledgeBase");
const { retrieveFitnessKnowledge } = require("../services/aiSpecialistKnowledgeService");

const APPROVED_SOURCE_LABELS = new Set([
  "Frontiers 2022 hypertrophy review",
  "Grgic/Schoenfeld et al. 2022 failure review",
  "Sports 2021 loading review",
  "Physical Activity Guidelines for Americans",
  "ACOG pregnancy/postpartum guidance",
  "NIH ODS exercise/performance supplement fact sheet",
  "Coach intake product rule + general resistance training evidence"
]);

const APPROVED_SOURCE_URLS = new Set(Object.values(SOURCE_URLS));

function baseContext(overrides = {}) {
  return {
    profile: {
      goal: "general fitness",
      level: "beginner",
      biologicalSex: "male",
      trainingDaysPerWeek: 3,
      equipmentAccess: ["gym"],
      injuries: [],
      limitations: [],
      coachIntake: {},
      ...(overrides.profile || {})
    },
    sessions: {
      recentCount: 0,
      completedCount: 0,
      completionRate: null,
      averageSetCompletionPercent: null,
      ...(overrides.sessions || {})
    },
    issues: {
      recentCount: 0,
      issueThemes: [],
      ...(overrides.issues || {})
    },
    currentPlan: {
      hasCurrentPlan: false,
      ...(overrides.currentPlan || {})
    }
  };
}

function ids(items) {
  return items.map((item) => item.id);
}

function text(items) {
  return items
    .map((item) => [item.id, item.topic, item.principle, item.coachingUse].join(" "))
    .join(" ");
}

test("fitness knowledge base items have approved sources and required evidence fields", () => {
  assert.equal(FITNESS_KNOWLEDGE_BASE_VERSION, "fitness_kb_v0.3");
  assert.ok(FITNESS_KNOWLEDGE_ITEMS.length >= 25);
  assert.ok(FITNESS_KNOWLEDGE_ITEMS.length <= 35);

  FITNESS_KNOWLEDGE_ITEMS.forEach((item) => {
    assert.ok(item.sourceLabel, `${item.id} is missing sourceLabel`);
    assert.ok(item.evidenceLevel, `${item.id} is missing evidenceLevel`);
    assert.ok(
      APPROVED_SOURCE_LABELS.has(item.sourceLabel),
      `${item.id} uses unapproved source label: ${item.sourceLabel}`
    );
    assert.ok(item.sourceUrl || item.sourceId, `${item.id} is missing sourceUrl/sourceId`);

    if (item.sourceUrl) {
      assert.ok(APPROVED_SOURCE_URLS.has(item.sourceUrl), `${item.id} uses an unapproved URL`);
    }
    if (item.sourceId) {
      assert.equal(item.sourceId, COACHING_RULE_SOURCE_ID);
    }
  });
});

test("professional rule pack has explicit evidence metadata and valid sources", () => {
  const sourceIds = new Set(PROFESSIONAL_SOURCE_ITEMS.map((source) => source.id));

  assert.ok(PROFESSIONAL_SOURCE_ITEMS.length >= 10);
  assert.ok(PROFESSIONAL_RULES.length >= 10);

  PROFESSIONAL_RULES.forEach((rule) => {
    assert.ok(rule.id, "rule is missing id");
    assert.ok(Array.isArray(rule.sourceItemIds), `${rule.id} is missing sourceItemIds`);
    assert.ok(rule.sourceItemIds.length > 0, `${rule.id} has no sourceItemIds`);
    assert.ok(rule.evidenceSummary, `${rule.id} is missing evidenceSummary`);
    assert.ok(rule.evidenceLevel, `${rule.id} is missing evidenceLevel`);
    assert.ok(Array.isArray(rule.limitations), `${rule.id} is missing limitations`);
    assert.ok(rule.limitations.length > 0, `${rule.id} has no limitations`);
    assert.match(rule.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(["high", "medium", "low"].includes(rule.confidence), `${rule.id} has invalid confidence`);

    rule.sourceItemIds.forEach((sourceItemId) => {
      assert.ok(sourceIds.has(sourceItemId), `${rule.id} uses unknown source ${sourceItemId}`);
    });

    if (rule.category === "pain_safety") {
      assert.ok(rule.sourceItemIds.includes("src_aaos_safe_exercise"), `${rule.id} must include AAOS`);
    }
    if (rule.category === "body_measurements") {
      assert.match(rule.evidenceSummary, /support|trend|waist|anthropometric|measurement/i);
    }
  });
});

test("female beginner muscle gain retrieves lower-body balance and upper-body maintenance guidance", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "muscle gain",
        level: "beginner",
        biologicalSex: "female",
        coachIntake: {
          mainGoal: "hypertrophy",
          trainingArchetype: "female_beginner_balanced_lower_body_bias",
          priorityMuscleGroups: ["glutes", "hamstrings", "quads"],
          maintenanceMuscleGroups: ["shoulders", "back"],
          avoidSpecialization: ["upper_body_width"]
        }
      }
    })
  });

  assert.ok(ids(items).includes("fit_kb_025_female_beginner_lower_body_bias"));
  assert.ok(ids(items).includes("fit_kb_026_upper_body_maintenance"));
  assert.match(text(items), /lower-body|glute/i);
  assert.match(text(items), /maintenance/i);
});

test("hypertrophy retrieves close-to-failure and selective failure guidance", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "muscle gain hypertrophy",
        level: "intermediate",
        biologicalSex: "male",
        coachIntake: {
          mainGoal: "hypertrophy"
        }
      }
    }),
    limit: 6
  });
  const combined = text(items);

  assert.match(combined, /close to failure|close-to-failure/i);
  assert.match(combined, /failure is useful and allowed/i);
  assert.match(combined, /selectively|selective/i);
  assert.doesNotMatch(combined, /failure is unnecessary/i);
});

test("low adherence retrieves simplify and adherence guidance", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      sessions: {
        recentCount: 5,
        completedCount: 2,
        completionRate: 40,
        averageSetCompletionPercent: 65
      }
    }),
    expertRules: {
      warnings: ["Recent workout adherence is low."],
      recommendedAdjustments: ["Keep the plan simple and avoid adding extra volume."],
      explanationHints: []
    }
  });

  assert.ok(ids(items).includes("fit_kb_030_adherence_simplify"));
  assert.match(text(items), /simpler|adherence/i);
});

test("knee pain retrieves pain recovery and substitution guidance", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        injuries: ["knee pain"],
        limitations: ["lunges cause discomfort"]
      },
      issues: {
        recentCount: 1,
        issueThemes: ["knee discomfort on lunges"]
      }
    }),
    expertRules: {
      warnings: ["Recent workout issues were reported: knee discomfort on lunges."],
      recommendedAdjustments: ["Prefer lower-risk substitutions for painful movement patterns."],
      explanationHints: []
    }
  });

  assert.ok(ids(items).includes("fit_kb_020_lower_risk_substitutions"));
  assert.match(text(items), /pain|substitut|knee/i);
});

test("combined context keeps safety and adherence knowledge within cap", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "muscle gain",
        level: "beginner",
        biologicalSex: "female",
        injuries: ["knee pain"],
        limitations: ["lunges cause discomfort"],
        coachIntake: {
          mainGoal: "hypertrophy",
          trainingArchetype: "female_beginner_balanced_lower_body_bias",
          priorityMuscleGroups: ["glutes", "hamstrings", "quads"],
          maintenanceMuscleGroups: ["shoulders", "back"],
          avoidSpecialization: ["upper_body_width"]
        }
      },
      sessions: {
        recentCount: 5,
        completedCount: 2,
        completionRate: 40,
        averageSetCompletionPercent: 65
      },
      issues: {
        recentCount: 1,
        issueThemes: ["knee discomfort on lunges"]
      }
    }),
    expertRules: {
      warnings: [
        "Recent workout adherence is low.",
        "Recent workout issues were reported: knee discomfort on lunges."
      ],
      recommendedAdjustments: [
        "Keep the plan simple and avoid adding extra volume.",
        "Prefer lower-risk substitutions for painful movement patterns."
      ],
      explanationHints: []
    },
    limit: 6
  });

  assert.equal(items.length, 6);
  assert.ok(ids(items).includes("fit_kb_020_lower_risk_substitutions"));
  assert.ok(ids(items).includes("fit_kb_030_adherence_simplify"));
});

test("advanced bodybuilding does not receive female beginner defaults", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "bodybuilding hypertrophy",
        level: "advanced",
        biologicalSex: "female",
        coachIntake: {
          mainGoal: "bodybuilding",
          trainingArchetype: "advanced_bodybuilding_split",
          priorityMuscleGroups: ["upper_body"]
        }
      }
    }),
    limit: 6
  });

  assert.ok(!ids(items).includes("fit_kb_025_female_beginner_lower_body_bias"));
  assert.ok(!ids(items).includes("fit_kb_026_upper_body_maintenance"));
  assert.ok(!ids(items).includes("fit_kb_027_glute_priority_not_exclusive"));
});

test("retrieval is capped", () => {
  const items = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "muscle gain hypertrophy",
        level: "beginner",
        biologicalSex: "female",
        coachIntake: {
          mainGoal: "hypertrophy",
          trainingArchetype: "female_beginner_balanced_lower_body_bias",
          priorityMuscleGroups: ["glutes", "hamstrings", "quads"],
          maintenanceMuscleGroups: ["shoulders", "back"],
          avoidSpecialization: ["upper_body_width"]
        }
      }
    }),
    limit: 3
  });

  assert.equal(items.length, 3);
});

test("pregnancy postpartum and supplement items do not retrieve without explicit context", () => {
  const normalItems = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "muscle gain",
        level: "beginner",
        biologicalSex: "female"
      }
    }),
    limit: 6
  });

  assert.ok(!ids(normalItems).includes("fit_kb_032_pregnancy_safety"));
  assert.ok(!ids(normalItems).includes("fit_kb_033_postpartum_return"));
  assert.ok(!ids(normalItems).includes("fit_kb_034_supplement_safety_scope"));
  assert.ok(!ids(normalItems).includes("fit_kb_035_supplement_no_plan_driver"));

  const pregnancyItems = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        level: "beginner",
        biologicalSex: "female",
        coachIntake: {
          lifeStage: "pregnancy"
        }
      }
    })
  });
  const supplementItems = retrieveFitnessKnowledge({
    specialistContext: baseContext({
      profile: {
        goal: "question about creatine supplement",
        coachIntake: {
          constraints: ["supplement question"]
        }
      }
    })
  });

  assert.ok(ids(pregnancyItems).includes("fit_kb_032_pregnancy_safety"));
  assert.ok(ids(supplementItems).includes("fit_kb_034_supplement_safety_scope"));
});
