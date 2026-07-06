const crypto = require("crypto");
const { AiSpecialistSignalPattern } = require("../models");

// Generic, vocabulary-agnostic engine for classifying a single piece of trainee
// free text into a bounded signal set, with a deterministic-first waterfall:
//   deterministic built-in -> learned-pattern cache -> LLM (last resort) -> store.
// Each call site supplies its own `vocabulary` (allowed signals, deterministic
// tag parser, relevance patterns, and default LLM classifier). The LLM only maps
// text into the supplied signal set; it never makes training decisions.

const HIGH_CONFIDENCE_SCORE = 0.85;
const MAX_SIGNAL_PATTERN_CACHE = 250;
const MAX_SIGNAL_PATTERN_LIST_LIMIT = 100;

const GENERIC_QUALITY_CATEGORIES = new Set([
  "actionable",
  "neutral_valid",
  "irrelevant",
  "unsafe_or_junk",
  "needs_review"
]);

const UNSAFE_OR_JUNK_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b\S+@\S+\.\S+\b/i,
  /\b(?:github|stackoverflow)\b/i,
  /```|<script|<\/script/i,
  /\bselect\s+\*|\bdrop\s+table|\binsert\s+into|\bdelete\s+from/i,
  /\bconsole\.log\b|\bfunction\s*\(|=>/i,
  /\bignore (?:all )?(?:previous|system) instructions\b/i,
  /\b(?:search|open|click)\s+(?:http|www|website|url|link)\b/i
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function filterAllowedSignals(values, allowedSignalsSet) {
  return unique(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter((value) => allowedSignalsSet.has(value))
  );
}

function hashPattern(normalizedPattern) {
  return crypto.createHash("sha256").update(normalizedPattern).digest("hex");
}

function plainPatternRecord(record) {
  return record && typeof record.toJSON === "function" ? record.toJSON() : record;
}

function formatSignalPatternForAdmin(record, allowedSignalsSet) {
  const data = plainPatternRecord(record) || {};
  return {
    patternId: data.patternId,
    normalizedPattern: data.normalizedPattern,
    language: data.language || "unknown",
    qualityCategory: data.qualityCategory || "needs_review",
    signals: filterAllowedSignals(data.signals, allowedSignalsSet),
    confidenceScore: Number(data.confidenceScore || 0),
    confidenceLabel: data.confidenceLabel || "low",
    hitCount: Number(data.hitCount || 0),
    lastMatchedAt: data.lastMatchedAt || null,
    status: data.status || "active",
    createDate: data.createDate || null,
    updateDate: data.updateDate || null
  };
}

function clampPatternListLimit(limit) {
  const parsedLimit = Number(limit);
  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) return 50;
  return Math.min(parsedLimit, MAX_SIGNAL_PATTERN_LIST_LIMIT);
}

function normalizeSignalPattern(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+|\bwww\.\S+/gi, " ")
    .replace(/\b\S+@\S+\.\S+\b/g, " ")
    .replace(/\d+/g, "#")
    .replace(/[^\p{L}\p{N}#\s]/gu, " ")
    .replace(/(?:#\s*){2,}/g, "# ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function languageFor(text) {
  return /[֐-׿]/.test(String(text || "")) ? "he" : "en";
}

function isUnsafeOrJunk(text) {
  return UNSAFE_OR_JUNK_PATTERNS.some((pattern) => pattern.test(text));
}

function looksPersonalOrTooSpecific(normalizedPattern) {
  if (!normalizedPattern || normalizedPattern.length > 160) return true;
  if ((normalizedPattern.match(/#/g) || []).length > 2) return true;
  return normalizedPattern.split(/\s+/).length > 18;
}

function classifyBuiltIn(text, vocabulary) {
  const trimmed = String(text || "").trim();
  const normalizedPattern = normalizeSignalPattern(trimmed);

  if (!trimmed) {
    return {
      qualityCategory: "irrelevant",
      ignoredReason: "empty",
      signals: [],
      confidenceLabel: "high",
      confidenceScore: 1,
      source: "deterministic",
      normalizedPattern
    };
  }

  if (isUnsafeOrJunk(trimmed)) {
    return {
      qualityCategory: "unsafe_or_junk",
      ignoredReason: "unsafe_or_junk",
      signals: [],
      confidenceLabel: "high",
      confidenceScore: 1,
      source: "deterministic",
      normalizedPattern
    };
  }

  const signals = vocabulary.parseTags(trimmed);
  if (signals.length > 0) {
    return {
      qualityCategory: "actionable",
      signals,
      confidenceLabel: "high",
      confidenceScore: 0.95,
      source: "deterministic",
      normalizedPattern
    };
  }

  if (vocabulary.neutralValidPatterns.some((pattern) => pattern.test(trimmed))) {
    return {
      qualityCategory: "neutral_valid",
      ignoredReason: "neutral_valid",
      signals: [],
      confidenceLabel: "medium",
      confidenceScore: 0.75,
      source: "deterministic",
      normalizedPattern
    };
  }

  if (vocabulary.irrelevantPatterns.some((pattern) => pattern.test(trimmed)) || normalizedPattern.length <= 2) {
    return {
      qualityCategory: "irrelevant",
      ignoredReason: "irrelevant",
      signals: [],
      confidenceLabel: "medium",
      confidenceScore: 0.75,
      source: "deterministic",
      normalizedPattern
    };
  }

  return null;
}

function normalizeConfidenceLabel(value) {
  const label = String(value || "").trim().toLowerCase();
  return ["high", "medium", "low"].includes(label) ? label : "low";
}

function normalizeConfidenceScore(value, fallbackLabel = "low") {
  const score = Number(value);
  if (Number.isFinite(score)) {
    return Math.max(0, Math.min(1, score));
  }
  if (fallbackLabel === "high") return HIGH_CONFIDENCE_SCORE;
  if (fallbackLabel === "medium") return 0.65;
  return 0.25;
}

function createFreeTextClassifier(vocabulary) {
  const allowedSignalsSet = vocabulary.allowedSignals;
  // Optional cache namespace. When set, the learned-pattern hash is prefixed so entries
  // never collide across scopes (the model's unique patternHash is respected), and reads/
  // writes stay isolated per entry point. Unset keeps the legacy (weekly check-in) hashing.
  const cacheScope = vocabulary.cacheScope || null;
  const scopeValue = cacheScope || "weekly_check_in";

  function scopedHash(normalizedPattern) {
    return hashPattern(cacheScope ? `${cacheScope}:${normalizedPattern}` : normalizedPattern);
  }

  async function readCachedClassification(normalizedPattern, { signalPatternModel = AiSpecialistSignalPattern } = {}) {
    if (!normalizedPattern || !signalPatternModel?.findOne) return null;

    const patternHash = scopedHash(normalizedPattern);
    const cached = await signalPatternModel.findOne({
      where: {
        patternHash,
        status: "active"
      }
    });

    if (!cached) return null;

    const data = typeof cached.toJSON === "function" ? cached.toJSON() : cached;
    const signals = filterAllowedSignals(data.signals, allowedSignalsSet);
    const qualityCategory = data.qualityCategory === "actionable" && signals.length > 0
      ? "actionable"
      : "needs_review";

    if (typeof cached.update === "function") {
      await cached.update({
        hitCount: Number(data.hitCount || 0) + 1,
        lastMatchedAt: new Date()
      });
    }

    return {
      qualityCategory,
      signals,
      confidenceLabel: data.confidenceLabel || "high",
      confidenceScore: Number(data.confidenceScore || HIGH_CONFIDENCE_SCORE),
      source: "cache",
      normalizedPattern
    };
  }

  async function storeCachedClassification(classification, {
    language = "unknown",
    signalPatternModel = AiSpecialistSignalPattern
  } = {}) {
    if (!signalPatternModel?.findOrCreate) return null;
    if (classification.qualityCategory !== "actionable") return null;

    const signals = filterAllowedSignals(classification.signals, allowedSignalsSet);
    const normalizedPattern = normalizeSignalPattern(classification.normalizedPattern);
    const isHighConfidence =
      classification.confidenceLabel === "high" ||
      Number(classification.confidenceScore || 0) >= HIGH_CONFIDENCE_SCORE;

    if (!signals.length || !isHighConfidence || looksPersonalOrTooSpecific(normalizedPattern)) {
      return null;
    }

    const patternHash = scopedHash(normalizedPattern);
    const defaults = {
      normalizedPattern,
      patternHash,
      language,
      scope: scopeValue,
      qualityCategory: "actionable",
      signals,
      confidenceScore: Math.max(Number(classification.confidenceScore || 0), HIGH_CONFIDENCE_SCORE),
      confidenceLabel: "high",
      source: "llm",
      hitCount: 0,
      status: "active"
    };

    const [record, created] = await signalPatternModel.findOrCreate({
      where: { patternHash },
      defaults
    });

    if (!created && typeof record.update === "function") {
      await record.update({
        signals,
        qualityCategory: "actionable",
        confidenceScore: defaults.confidenceScore,
        confidenceLabel: "high",
        status: "active"
      });
    }

    await pruneSignalPatternCache({ signalPatternModel }).catch(() => null);

    return record || null;
  }

  async function listSignalPatterns({
    limit = 50,
    status = "active",
    signalPatternModel = AiSpecialistSignalPattern
  } = {}) {
    if (!signalPatternModel?.findAll) return [];

    const normalizedStatus = typeof status === "string" && status.trim()
      ? status.trim()
      : null;
    const where = normalizedStatus
      ? { scope: scopeValue, status: normalizedStatus }
      : { scope: scopeValue };
    const records = await signalPatternModel.findAll({
      where,
      order: [["hitCount", "DESC"], ["patternId", "ASC"]],
      limit: clampPatternListLimit(limit)
    });

    return records.map((record) => formatSignalPatternForAdmin(record, allowedSignalsSet));
  }

  async function disableSignalPattern(patternId, {
    signalPatternModel = AiSpecialistSignalPattern
  } = {}) {
    if (!signalPatternModel?.findByPk) return null;

    const id = Number(patternId);
    if (!Number.isInteger(id) || id <= 0) return null;

    const record = await signalPatternModel.findByPk(id);
    if (!record || typeof record.update !== "function") return null;

    await record.update({ status: "disabled" });
    return formatSignalPatternForAdmin(record, allowedSignalsSet);
  }

  async function pruneSignalPatternCache({
    maxEntries = MAX_SIGNAL_PATTERN_CACHE,
    signalPatternModel = AiSpecialistSignalPattern
  } = {}) {
    if (!signalPatternModel?.findAll) return [];

    const cap = Number.isInteger(maxEntries) && maxEntries > 0
      ? maxEntries
      : MAX_SIGNAL_PATTERN_CACHE;
    const records = await signalPatternModel.findAll({
      where: { scope: scopeValue, status: "active" },
      order: [["hitCount", "DESC"], ["patternId", "ASC"]]
    });
    const overflow = records.slice(cap);

    await Promise.all(overflow.map(async (record) => {
      if (typeof record.update === "function") {
        await record.update({ status: "disabled" });
      }
    }));

    return overflow.map((record) => formatSignalPatternForAdmin(record, allowedSignalsSet));
  }

  async function classifyText(text, options = {}) {
    const deterministic = classifyBuiltIn(text, vocabulary);
    if (deterministic) {
      return deterministic;
    }

    const normalizedPattern = normalizeSignalPattern(text);
    const language = languageFor(text);
    const cached = await readCachedClassification(normalizedPattern, options).catch(() => null);
    if (cached) {
      return cached;
    }

    const llmClassifier = options.llmClassifier || vocabulary.defaultLlmClassifier;
    try {
      const llmResult = await llmClassifier(text, options);
      const normalized = {
        ...llmResult,
        signals: llmResult.qualityCategory === "actionable"
          ? filterAllowedSignals(llmResult.signals, allowedSignalsSet)
          : [],
        normalizedPattern: normalizeSignalPattern(llmResult.normalizedPattern || text)
      };

      await storeCachedClassification(normalized, { ...options, language }).catch(() => null);
      return normalized;
    } catch (error) {
      const fallbackSignals = vocabulary.parseTags(text);
      if (fallbackSignals.length > 0) {
        return {
          qualityCategory: "actionable",
          signals: fallbackSignals,
          confidenceLabel: "medium",
          confidenceScore: 0.65,
          source: "fallback",
          normalizedPattern
        };
      }

      return {
        qualityCategory: "needs_review",
        ignoredReason: "needs_review",
        signals: [],
        confidenceLabel: "low",
        confidenceScore: 0.25,
        source: "fallback",
        normalizedPattern
      };
    }
  }

  return {
    classifyText,
    classifyBuiltIn: (text) => classifyBuiltIn(text, vocabulary),
    readCachedClassification,
    storeCachedClassification,
    listSignalPatterns,
    disableSignalPattern,
    pruneSignalPatternCache,
    formatSignalPatternForAdmin: (record) => formatSignalPatternForAdmin(record, allowedSignalsSet)
  };
}

module.exports = {
  GENERIC_QUALITY_CATEGORIES,
  HIGH_CONFIDENCE_SCORE,
  MAX_SIGNAL_PATTERN_CACHE,
  MAX_SIGNAL_PATTERN_LIST_LIMIT,
  UNSAFE_OR_JUNK_PATTERNS,
  clampPatternListLimit,
  createFreeTextClassifier,
  filterAllowedSignals,
  formatSignalPatternForAdmin,
  hashPattern,
  isUnsafeOrJunk,
  languageFor,
  looksPersonalOrTooSpecific,
  normalizeConfidenceLabel,
  normalizeConfidenceScore,
  normalizeSignalPattern,
  plainPatternRecord,
  unique
};
