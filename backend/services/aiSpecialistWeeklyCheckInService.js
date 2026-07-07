const {
  HIGH_CONFIDENCE_SCORE,
  MAX_SIGNAL_PATTERN_CACHE,
  MAX_SIGNAL_PATTERN_LIST_LIMIT,
  hashPattern,
  normalizeSignalPattern,
  unique
} = require("./freeTextClassificationService");
const {
  ALLOWED_SIGNALS,
  IRRELEVANT_PATTERNS,
  NEUTRAL_VALID_PATTERNS,
  allowedSignals,
  classifyBuiltIn,
  classifyWeeklyCheckInText,
  classifyWeeklyCheckInWithLlm,
  disableSignalPattern,
  formatSignalPatternForAdmin,
  listSignalPatterns,
  parseWeeklyCheckInTags,
  pruneSignalPatternCache,
  readCachedClassification,
  storeCachedClassification
} = require("./weeklyCheckInClassification");

const FITNESS_WEEKLY_CHECK_IN_VERSION = "fitness_weekly_check_in_v0.2";

const MAX_WEEKLY_CHECK_IN_ANSWERS = 3;
const MAX_WEEKLY_CHECK_IN_ANSWER_CHARS = 300;
const MAX_WEEKLY_CHECK_IN_QUESTION_CHARS = 180;
const MAX_WEEKLY_CHECK_IN_GENERAL_NOTE_CHARS = 500;
const MAX_WEEKLY_CHECK_IN_HISTORY = 8;

const CHECK_IN_GUIDANCE_MESSAGE =
  "I did not find training details to use. Add a note about load, pain, fatigue, equipment, or what felt different.";
const CHECK_IN_SUCCESS_MESSAGE = "Coach will use this for next week.";

const SELECTED_TAG_SIGNAL_MAP = {
  too_hard: "too_hard",
  too_easy: "too_easy",
  pain_signal: "pain_signal",
  pain: "pain_signal",
  fatigue_signal: "fatigue_signal",
  fatigue: "fatigue_signal",
  no_equipment: "equipment_unavailable",
  equipment_unavailable: "equipment_unavailable",
  felt_good: "felt_good",
  want_more_focus: "focus_preference",
  focus_preference: "focus_preference",
  motivation: "motivation"
};

const RECURRENCE_SIGNAL_MAP = {
  pain_signal: "recurring_check_in_pain",
  time_constraint: "repeated_time_constraint",
  fatigue_signal: "repeated_fatigue_signal",
  equipment_unavailable: "repeated_equipment_constraint"
};

function normalizeSelectedTags(selectedTags) {
  const details = {};

  if (selectedTags == null) {
    return { selectedTags: [], selectedSignals: [] };
  }

  if (!Array.isArray(selectedTags)) {
    details.selectedTags = "selectedTags must be an array of known tag strings.";
    return { details };
  }

  const normalizedTags = [];
  const selectedSignals = [];

  selectedTags.forEach((tag, index) => {
    const normalizedTag = String(tag || "").trim();
    const signal = SELECTED_TAG_SIGNAL_MAP[normalizedTag];

    if (!signal) {
      details[`selectedTags.${index}`] = "selected tag is not supported.";
      return;
    }

    normalizedTags.push(normalizedTag);
    selectedSignals.push(signal);
  });

  return Object.keys(details).length > 0
    ? { details }
    : {
        selectedTags: unique(normalizedTags),
        selectedSignals: unique(selectedSignals)
      };
}

function validateWeeklyCheckInPayload({ answers, generalNote, selectedTags } = {}) {
  const details = {};
  const normalizedAnswers = [];
  const hasAnswers = Array.isArray(answers) && answers.length > 0;
  const note = typeof generalNote === "string" ? generalNote.trim() : "";
  const tagValidation = normalizeSelectedTags(selectedTags);

  if (tagValidation.details) {
    Object.assign(details, tagValidation.details);
  }

  if (answers != null && !Array.isArray(answers)) {
    details.answers = "answers must be an array.";
  } else if (Array.isArray(answers) && answers.length > MAX_WEEKLY_CHECK_IN_ANSWERS) {
    details.answers = `Provide up to ${MAX_WEEKLY_CHECK_IN_ANSWERS} weekly check-in answers.`;
  } else if (Array.isArray(answers)) {
    answers.forEach((item, index) => {
      const answer = typeof item?.answer === "string" ? item.answer.trim() : "";
      const question = typeof item?.question === "string" ? item.question.trim() : "";

      if (!answer) {
        details[`answers.${index}.answer`] = "answer must not be empty when provided.";
      } else if (answer.length > MAX_WEEKLY_CHECK_IN_ANSWER_CHARS) {
        details[`answers.${index}.answer`] = `answer must be ${MAX_WEEKLY_CHECK_IN_ANSWER_CHARS} characters or fewer.`;
      }

      if (item?.question != null && typeof item.question !== "string") {
        details[`answers.${index}.question`] = "question must be a string.";
      } else if (question.length > MAX_WEEKLY_CHECK_IN_QUESTION_CHARS) {
        details[`answers.${index}.question`] = `question must be ${MAX_WEEKLY_CHECK_IN_QUESTION_CHARS} characters or fewer.`;
      }

      normalizedAnswers.push({ question, answer });
    });
  }

  if (generalNote != null && typeof generalNote !== "string") {
    details.generalNote = "generalNote must be a string.";
  } else if (note.length > MAX_WEEKLY_CHECK_IN_GENERAL_NOTE_CHARS) {
    details.generalNote = `generalNote must be ${MAX_WEEKLY_CHECK_IN_GENERAL_NOTE_CHARS} characters or fewer.`;
  }

  const hasSelectedSignals = (tagValidation.selectedSignals || []).length > 0;
  if (!hasAnswers && !note && !hasSelectedSignals && !details.answers) {
    details.answers = "Provide at least one answer, a generalNote, or selectedTags.";
  }

  return Object.keys(details).length > 0
    ? { details }
    : {
        normalizedAnswers,
        generalNote: note,
        selectedTags: tagValidation.selectedTags,
        selectedSignals: tagValidation.selectedSignals
      };
}

function answerQualityItem({ type, question = "", answer = "", classification }) {
  return {
    type,
    question,
    answer,
    category: classification.qualityCategory,
    signals: allowedSignals(classification.signals),
    confidenceLabel: classification.confidenceLabel || "low"
  };
}

function ignoredAnswerItem({ type, question = "", answer = "", classification }) {
  return {
    type,
    question,
    category: classification.qualityCategory,
    reason: classification.ignoredReason || classification.qualityCategory
  };
}

async function buildFitnessWeeklyCheckIn(payload = {}, options = {}) {
  const validation = validateWeeklyCheckInPayload(payload);

  if (validation.details) {
    return { details: validation.details };
  }

  const answerQuality = [];
  const ignoredAnswers = [];
  const normalizedAnswers = [];
  let generalNote = null;
  let unsafeFound = false;

  for (const item of validation.normalizedAnswers) {
    const classification = await classifyWeeklyCheckInText(item.answer, options);
    if (classification.qualityCategory === "unsafe_or_junk") {
      unsafeFound = true;
    }

    const tags = classification.qualityCategory === "actionable"
      ? allowedSignals(classification.signals)
      : [];
    normalizedAnswers.push({
      ...item,
      tags,
      qualityCategory: classification.qualityCategory
    });
    answerQuality.push(answerQualityItem({
      type: "answer",
      question: item.question,
      answer: item.answer,
      classification
    }));
    if (classification.qualityCategory !== "actionable") {
      ignoredAnswers.push(ignoredAnswerItem({
        type: "answer",
        question: item.question,
        answer: item.answer,
        classification
      }));
    }
  }

  if (validation.generalNote) {
    const classification = await classifyWeeklyCheckInText(validation.generalNote, options);
    if (classification.qualityCategory === "unsafe_or_junk") {
      unsafeFound = true;
    }

    generalNote = {
      text: validation.generalNote,
      tags: classification.qualityCategory === "actionable"
        ? allowedSignals(classification.signals)
        : [],
      qualityCategory: classification.qualityCategory
    };
    answerQuality.push(answerQualityItem({
      type: "generalNote",
      answer: validation.generalNote,
      classification
    }));
    if (classification.qualityCategory !== "actionable") {
      ignoredAnswers.push(ignoredAnswerItem({
        type: "generalNote",
        answer: validation.generalNote,
        classification
      }));
    }
  }

  if (unsafeFound) {
    return {
      details: {
        content: "Remove links, code, external requests, or unsafe/junk text from the check-in."
      }
    };
  }

  const parsedSignals = unique([
    ...normalizedAnswers.flatMap((item) => item.tags),
    ...(generalNote?.tags || []),
    ...validation.selectedSignals
  ]);
  const usableAnswerCount =
    normalizedAnswers.filter((item) => item.tags.length > 0).length +
    (generalNote?.tags?.length ? 1 : 0) +
    validation.selectedSignals.length;
  const message = usableAnswerCount > 0 ? CHECK_IN_SUCCESS_MESSAGE : CHECK_IN_GUIDANCE_MESSAGE;

  return {
    normalized: {
      received: true,
      version: FITNESS_WEEKLY_CHECK_IN_VERSION,
      message,
      parsedSignals,
      answers: normalizedAnswers,
      generalNote,
      selectedTags: validation.selectedTags,
      answerQuality,
      ignoredAnswers,
      usableAnswerCount
    }
  };
}

function normalizeWeeklyCheckInHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      version: item.version || FITNESS_WEEKLY_CHECK_IN_VERSION,
      submittedAt: typeof item.submittedAt === "string" ? item.submittedAt : null,
      answers: Array.isArray(item.answers) ? item.answers.slice(0, MAX_WEEKLY_CHECK_IN_ANSWERS) : [],
      generalNote: item.generalNote && typeof item.generalNote === "object" ? item.generalNote : null,
      selectedTags: Array.isArray(item.selectedTags) ? item.selectedTags : [],
      answerQuality: Array.isArray(item.answerQuality) ? item.answerQuality : [],
      ignoredAnswers: Array.isArray(item.ignoredAnswers) ? item.ignoredAnswers : [],
      usableAnswerCount: Number.isInteger(item.usableAnswerCount) ? item.usableAnswerCount : 0,
      parsedSignals: unique(Array.isArray(item.parsedSignals) ? item.parsedSignals : []),
      previewSummary: item.previewSummary && typeof item.previewSummary === "object" ? item.previewSummary : null
    }))
    .slice(-MAX_WEEKLY_CHECK_IN_HISTORY);
}

function buildWeeklyCheckInRecurrenceSignals(history) {
  const counts = new Map();

  normalizeWeeklyCheckInHistory(history).forEach((item) => {
    unique(item.parsedSignals).forEach((signal) => {
      counts.set(signal, (counts.get(signal) || 0) + 1);
    });
  });

  return unique(
    Object.entries(RECURRENCE_SIGNAL_MAP)
      .filter(([signal]) => (counts.get(signal) || 0) >= 2)
      .map(([, recurrenceSignal]) => recurrenceSignal)
  );
}

function latestWeeklyCheckInSignals(history) {
  const normalizedHistory = normalizeWeeklyCheckInHistory(history);
  const latest = normalizedHistory[normalizedHistory.length - 1];

  return latest ? latest.parsedSignals : [];
}

function buildWeeklyReviewCheckInSignals({ history = [], currentSignals = [] } = {}) {
  const baseSignals = Array.isArray(currentSignals) && currentSignals.length
    ? currentSignals
    : latestWeeklyCheckInSignals(history);

  return unique([
    ...baseSignals,
    ...buildWeeklyCheckInRecurrenceSignals(history)
  ]);
}

function buildWeeklyCheckInSnapshot({ checkIn, preview, submittedAt = new Date().toISOString() } = {}) {
  const previewReasonCodes = Array.isArray(preview?.reasonCodes) ? preview.reasonCodes : [];

  return {
    version: FITNESS_WEEKLY_CHECK_IN_VERSION,
    submittedAt,
    answers: (checkIn?.answers || []).slice(0, MAX_WEEKLY_CHECK_IN_ANSWERS).map((item) => ({
      question: item.question || "",
      answer: item.answer || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      qualityCategory: item.qualityCategory || null
    })),
    generalNote: checkIn?.generalNote || null,
    selectedTags: Array.isArray(checkIn?.selectedTags) ? checkIn.selectedTags : [],
    answerQuality: Array.isArray(checkIn?.answerQuality) ? checkIn.answerQuality : [],
    ignoredAnswers: Array.isArray(checkIn?.ignoredAnswers) ? checkIn.ignoredAnswers : [],
    usableAnswerCount: Number.isInteger(checkIn?.usableAnswerCount) ? checkIn.usableAnswerCount : 0,
    parsedSignals: unique(checkIn?.parsedSignals || []),
    previewSummary: {
      reviewDecision: preview?.reviewDecision || null,
      reasonCodes: previewReasonCodes
    }
  };
}

function appendWeeklyCheckInHistory(history, snapshot) {
  return [...normalizeWeeklyCheckInHistory(history), snapshot].slice(-MAX_WEEKLY_CHECK_IN_HISTORY);
}

module.exports = {
  ALLOWED_SIGNALS,
  CHECK_IN_GUIDANCE_MESSAGE,
  CHECK_IN_SUCCESS_MESSAGE,
  FITNESS_WEEKLY_CHECK_IN_VERSION,
  HIGH_CONFIDENCE_SCORE,
  IRRELEVANT_PATTERNS,
  MAX_SIGNAL_PATTERN_CACHE,
  MAX_SIGNAL_PATTERN_LIST_LIMIT,
  MAX_WEEKLY_CHECK_IN_ANSWERS,
  MAX_WEEKLY_CHECK_IN_ANSWER_CHARS,
  MAX_WEEKLY_CHECK_IN_GENERAL_NOTE_CHARS,
  MAX_WEEKLY_CHECK_IN_QUESTION_CHARS,
  MAX_WEEKLY_CHECK_IN_HISTORY,
  NEUTRAL_VALID_PATTERNS,
  appendWeeklyCheckInHistory,
  buildFitnessWeeklyCheckIn,
  buildWeeklyCheckInRecurrenceSignals,
  buildWeeklyCheckInSnapshot,
  buildWeeklyReviewCheckInSignals,
  classifyWeeklyCheckInText,
  classifyWeeklyCheckInWithLlm,
  disableSignalPattern,
  listSignalPatterns,
  normalizeWeeklyCheckInHistory,
  normalizeSignalPattern,
  parseWeeklyCheckInTags,
  pruneSignalPatternCache,
  _internals: {
    classifyBuiltIn,
    classifyWeeklyCheckInWithLlm,
    hashPattern,
    latestWeeklyCheckInSignals,
    normalizeSelectedTags,
    readCachedClassification,
    formatSignalPatternForAdmin,
    storeCachedClassification,
    validateWeeklyCheckInPayload
  }
};
