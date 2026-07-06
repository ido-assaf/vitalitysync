const FITNESS_KNOWLEDGE_BASE_VERSION = "fitness_kb_v0.3";

const SOURCE_URLS = {
  frontiers2022:
    "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.949021/full",
  failure2022: "https://www.sciencedirect.com/science/article/pii/S2095254621000077",
  sports2021: "https://www.mdpi.com/2075-4663/9/2/32",
  pagAmericans:
    "https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines",
  acog2020:
    "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period",
  nihOds: "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"
};

const COACHING_RULE_SOURCE_ID = "coach_intake_product_rule_v1";
const LAST_PROFESSIONAL_REVIEWED_AT = "2026-07-05";

const PROFESSIONAL_SOURCE_ITEMS = [
  {
    id: "src_acsm_progression_2009",
    label: "ACSM progression models in resistance training",
    url: "https://doi.org/10.1249/MSS.0b013e3181915670",
    evidenceLevel: "position_stand",
    domain: "load_progression"
  },
  {
    id: "src_schoenfeld_loading_2021",
    label: "Loading recommendations and repetition continuum review",
    url: SOURCE_URLS.sports2021,
    evidenceLevel: "review",
    domain: "load_progression"
  },
  {
    id: "src_grgic_failure_2022",
    label: "Failure versus non-failure systematic review and meta-analysis",
    url: SOURCE_URLS.failure2022,
    evidenceLevel: "systematic_review_meta_analysis",
    domain: "rir_failure"
  },
  {
    id: "src_robinson_rir_2024",
    label: "Resistance training proximity-to-failure meta-regressions",
    url: "https://link.springer.com/article/10.1007/s40279-024-02069-2",
    evidenceLevel: "meta_regression",
    domain: "rir_failure"
  },
  {
    id: "src_rt_dose_response_2025",
    label: "Resistance training volume and frequency dose-response meta-regressions",
    url: "https://link.springer.com/article/10.1007/s40279-025-02344-w",
    evidenceLevel: "meta_regression",
    domain: "volume_frequency"
  },
  {
    id: "src_frontiers_hypertrophy_2022",
    label: "Hypertrophy variables umbrella review",
    url: SOURCE_URLS.frontiers2022,
    evidenceLevel: "umbrella_review",
    domain: "volume_frequency"
  },
  {
    id: "src_iusca_hypertrophy_2021",
    label: "Athletic hypertrophy position stand",
    url: "https://journal.iusca.org/index.php/Journal/article/view/81",
    evidenceLevel: "position_stand",
    domain: "hypertrophy_specialization"
  },
  {
    id: "src_aaos_safe_exercise",
    label: "AAOS OrthoInfo safe exercise guidance",
    url: "https://orthoinfo.aaos.org/en/staying-healthy/safe-exercise/",
    evidenceLevel: "clinical_guidance",
    domain: "pain_safety"
  },
  {
    id: "src_mayo_weight_training",
    label: "Mayo Clinic weight training safety guidance",
    url: "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/weight-training/art-20045842",
    evidenceLevel: "medical_education",
    domain: "pain_safety"
  },
  {
    id: "src_nice_ng246_2026",
    label: "NICE NG246 obesity and central adiposity guidance",
    url:
      "https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity",
    evidenceLevel: "clinical_guideline",
    domain: "body_measurements"
  },
  {
    id: "src_who_waist_hip_2011",
    label: "WHO waist circumference and waist-hip ratio expert consultation",
    url: "https://www.who.int/publications/i/item/9789241501491",
    evidenceLevel: "expert_consultation",
    domain: "body_measurements"
  },
  {
    id: "src_rfm_2018",
    label: "Relative fat mass anthropometric estimator study",
    url: "https://www.nature.com/articles/s41598-018-29362-1",
    evidenceLevel: "cross_sectional_validation",
    domain: "body_composition_estimate"
  },
  {
    id: "src_bai_2012",
    label: "Body adiposity index validation limitations",
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0035281",
    evidenceLevel: "validation_study",
    domain: "body_composition_estimate"
  },
  {
    id: COACHING_RULE_SOURCE_ID,
    label: "Coach intake product rule",
    url: null,
    evidenceLevel: "coaching_rule",
    domain: "product_coaching"
  }
];

function professionalRule({
  id,
  category,
  sourceItemIds,
  evidenceSummary,
  evidenceLevel,
  limitations,
  confidence
}) {
  return {
    id,
    category,
    sourceItemIds,
    evidenceSummary,
    evidenceLevel,
    limitations,
    lastReviewedAt: LAST_PROFESSIONAL_REVIEWED_AT,
    confidence
  };
}

const PROFESSIONAL_RULES = [
  professionalRule({
    id: "rule_load_cautious_progression",
    category: "load_progression",
    sourceItemIds: ["src_acsm_progression_2009", "src_schoenfeld_loading_2021", "src_frontiers_hypertrophy_2022"],
    evidenceSummary:
      "Progress load, reps, or volume only after recent work is completed with stable performance and recovery.",
    evidenceLevel: "position_stand",
    limitations: ["Does not calculate a precise next load without a targetLoad policy.", "Does not override pain or recovery blockers."],
    confidence: "high"
  }),
  professionalRule({
    id: "rule_load_strength_priority",
    category: "load_progression",
    sourceItemIds: ["src_schoenfeld_loading_2021", "src_acsm_progression_2009"],
    evidenceSummary:
      "Strength outcomes are more load-specific than hypertrophy, so heavier loading matters when the goal is strength.",
    evidenceLevel: "review",
    limitations: ["Not used when pain, declining performance, or recovery risk is present."],
    confidence: "medium"
  }),
  professionalRule({
    id: "rule_load_hypertrophy_rep_flexibility",
    category: "load_progression",
    sourceItemIds: ["src_schoenfeld_loading_2021", "src_grgic_failure_2022", "src_robinson_rir_2024"],
    evidenceSummary:
      "Hypertrophy can be trained across broad loading zones when sets are sufficiently challenging; failure is selective.",
    evidenceLevel: "systematic_review_meta_analysis",
    limitations: ["Uses SetLogs and check-ins as indirect effort signals until RPE/RIR is stored directly."],
    confidence: "high"
  }),
  professionalRule({
    id: "rule_pause_progression_on_pain",
    category: "pain_safety",
    sourceItemIds: ["src_aaos_safe_exercise", "src_mayo_weight_training"],
    evidenceSummary:
      "Pain, severe symptoms, persistent symptoms, and fatigue are reasons to stop progressing and review training.",
    evidenceLevel: "clinical_guidance",
    limitations: ["Not a diagnosis or treatment recommendation.", "Does not identify the injury source."],
    confidence: "high"
  }),
  professionalRule({
    id: "rule_reduce_on_recovery_risk",
    category: "recovery",
    sourceItemIds: ["src_aaos_safe_exercise", "src_frontiers_hypertrophy_2022"],
    evidenceSummary:
      "Rapid increases in training stress and insufficient rest raise injury/recovery risk; reduce stress when recovery deteriorates.",
    evidenceLevel: "clinical_guidance",
    limitations: ["Does not diagnose medical causes of fatigue."],
    confidence: "high"
  }),
  professionalRule({
    id: "rule_substitution_same_training_intent",
    category: "exercise_substitution",
    sourceItemIds: ["src_iusca_hypertrophy_2021", "src_frontiers_hypertrophy_2022"],
    evidenceSummary:
      "Exercise selection should preserve the intended muscle and training stimulus while fitting the trainee context.",
    evidenceLevel: "position_stand",
    limitations: ["Candidate quality depends on exercise metadata quality."],
    confidence: "medium"
  }),
  professionalRule({
    id: "rule_substitution_pain_lower_risk",
    category: "exercise_substitution",
    sourceItemIds: ["src_aaos_safe_exercise", "src_mayo_weight_training"],
    evidenceSummary:
      "Painful exercise patterns should be reviewed and replaced with lower-risk options rather than progressed.",
    evidenceLevel: "clinical_guidance",
    limitations: ["Preview only; does not prescribe rehabilitation."],
    confidence: "high"
  }),
  professionalRule({
    id: "rule_body_trend_only",
    category: "body_measurements",
    sourceItemIds: ["src_who_waist_hip_2011", "src_nice_ng246_2026"],
    evidenceSummary:
      "Body measurements are meaningful as repeated measurements and central-adiposity estimates, not as single-point training decisions.",
    evidenceLevel: "clinical_guideline",
    limitations: ["The 2-measurement minimum is a conservative product threshold, not a diagnostic cutoff."],
    confidence: "high"
  }),
  professionalRule({
    id: "rule_body_fat_loss_support",
    category: "body_measurements",
    sourceItemIds: ["src_nice_ng246_2026", "src_who_waist_hip_2011", "src_rfm_2018"],
    evidenceSummary:
      "Waist and waist-to-height trends can support central adiposity interpretation when considered with body weight and performance.",
    evidenceLevel: "clinical_guideline",
    limitations: ["Supporting trend signal only; not a body-composition diagnosis."],
    confidence: "medium"
  }),
  professionalRule({
    id: "rule_body_recomp_support",
    category: "body_measurements",
    sourceItemIds: ["src_nice_ng246_2026", "src_rfm_2018", "src_bai_2012"],
    evidenceSummary:
      "Anthropometric body-fat estimates are imperfect; use them only as repeated supporting signals alongside performance.",
    evidenceLevel: "validation_study",
    limitations: ["BIA, RFM, BAI, and visual estimates are lower-confidence than direct body-composition methods."],
    confidence: "medium"
  }),
  professionalRule({
    id: "rule_lagging_muscle_candidate",
    category: "lagging_muscle",
    sourceItemIds: ["src_iusca_hypertrophy_2021", "src_rt_dose_response_2025", "src_frontiers_hypertrophy_2022"],
    evidenceSummary:
      "Specialization decisions require sufficient training history, volume context, and recovery capacity.",
    evidenceLevel: "position_stand",
    limitations: ["Not used for beginners by default.", "Circumference data is only a supporting signal."],
    confidence: "medium"
  }),
  professionalRule({
    id: "rule_lagging_muscle_intervention_preview",
    category: "lagging_muscle",
    sourceItemIds: ["src_frontiers_hypertrophy_2022", "src_rt_dose_response_2025", "src_iusca_hypertrophy_2021"],
    evidenceSummary:
      "Lagging areas can be prioritized by exercise order, small direct-volume increases, or frequency when recovery allows.",
    evidenceLevel: "umbrella_review",
    limitations: ["Blocked by pain, recovery risk, low adherence, or declining performance."],
    confidence: "medium"
  })
];

const FITNESS_KNOWLEDGE_ITEMS = [
  {
    id: "fit_kb_001_hypertrophy_close_to_failure",
    domain: "fitness",
    topic: "hypertrophy RIR",
    evidenceLevel: "systematic_review_meta_analysis",
    sourceLabel: "Grgic/Schoenfeld et al. 2022 failure review",
    sourceUrl: SOURCE_URLS.failure2022,
    principle:
      "Hypertrophy work should generally become challenging and close to failure, while failure is programmed selectively.",
    coachingUse:
      "Use hard working sets for muscle gain, with RIR targets adjusted by exercise risk, level, recovery, pain, and phase.",
    appliesTo: ["hypertrophy", "muscle_gain", "intermediate", "advanced"],
    avoidWhen: ["acute_pain"],
    tags: ["intensity", "failure", "rir", "hypertrophy"],
    confidence: "high"
  },
  {
    id: "fit_kb_002_failure_selective_allowed",
    domain: "fitness",
    topic: "selective failure",
    evidenceLevel: "systematic_review_meta_analysis",
    sourceLabel: "Grgic/Schoenfeld et al. 2022 failure review",
    sourceUrl: SOURCE_URLS.failure2022,
    principle:
      "Training to failure is useful and allowed, but it should not be the default on every set or every exercise.",
    coachingUse:
      "Reserve failure for lower-risk movements, later sets, recovered trainees, or planned phases; keep more reps in reserve when risk is higher.",
    appliesTo: ["hypertrophy", "advanced", "bodybuilding"],
    avoidWhen: ["beginner", "acute_pain", "low_recovery"],
    tags: ["intensity", "failure", "rir", "recovery"],
    confidence: "high"
  },
  {
    id: "fit_kb_003_beginner_rir_buffer",
    domain: "fitness",
    topic: "beginner RIR buffer",
    evidenceLevel: "systematic_review_meta_analysis",
    sourceLabel: "Grgic/Schoenfeld et al. 2022 failure review",
    sourceUrl: SOURCE_URLS.failure2022,
    principle:
      "Beginners can build skill and muscle with challenging non-failure sets before frequent all-out efforts are needed.",
    coachingUse:
      "Use a small RIR buffer while technique, confidence, and recovery capacity are still being built.",
    appliesTo: ["beginner", "hypertrophy", "technique"],
    avoidWhen: [],
    tags: ["intensity", "rir", "beginner", "technique"],
    confidence: "medium"
  },
  {
    id: "fit_kb_004_high_risk_failure_limit",
    domain: "fitness",
    topic: "failure risk control",
    evidenceLevel: "systematic_review_meta_analysis",
    sourceLabel: "Grgic/Schoenfeld et al. 2022 failure review",
    sourceUrl: SOURCE_URLS.failure2022,
    principle:
      "Failure exposure should be limited when technique breakdown would raise joint, balance, or recovery risk.",
    coachingUse:
      "Keep squats, hinges, loaded lunges, and painful patterns shy of failure unless the context clearly supports it.",
    appliesTo: ["pain", "injury_limitation", "beginner", "recovery"],
    avoidWhen: [],
    tags: ["intensity", "failure", "pain", "recovery"],
    confidence: "high"
  },
  {
    id: "fit_kb_005_strength_heavy_loading",
    domain: "fitness",
    topic: "strength loading",
    evidenceLevel: "review",
    sourceLabel: "Sports 2021 loading review",
    sourceUrl: SOURCE_URLS.sports2021,
    principle:
      "Strength-focused training usually benefits from heavier loading and lower repetition ranges than endurance-focused work.",
    coachingUse:
      "When the goal is strength, prioritize technically solid heavy work before accessories.",
    appliesTo: ["strength", "advanced", "intermediate"],
    avoidWhen: ["acute_pain", "low_adherence"],
    tags: ["loading", "strength", "rep_range"],
    confidence: "medium"
  },
  {
    id: "fit_kb_006_hypertrophy_broad_rep_ranges",
    domain: "fitness",
    topic: "hypertrophy loading",
    evidenceLevel: "review",
    sourceLabel: "Sports 2021 loading review",
    sourceUrl: SOURCE_URLS.sports2021,
    principle:
      "Hypertrophy can be trained across a broad range of loads when sets are sufficiently challenging.",
    coachingUse:
      "Choose rep ranges that match exercise safety, preference, and recovery rather than forcing one narrow range.",
    appliesTo: ["hypertrophy", "muscle_gain", "beginner", "intermediate", "advanced"],
    avoidWhen: [],
    tags: ["loading", "hypertrophy", "rep_range", "rir"],
    confidence: "high"
  },
  {
    id: "fit_kb_007_endurance_higher_reps",
    domain: "fitness",
    topic: "local endurance loading",
    evidenceLevel: "review",
    sourceLabel: "Sports 2021 loading review",
    sourceUrl: SOURCE_URLS.sports2021,
    principle:
      "Local muscular endurance is commonly emphasized with lighter loads and higher repetition work.",
    coachingUse:
      "Use higher-rep accessories when conditioning, tolerance, or lower joint load is the priority.",
    appliesTo: ["endurance", "fat_loss", "beginner", "pain"],
    avoidWhen: [],
    tags: ["loading", "endurance", "rep_range"],
    confidence: "medium"
  },
  {
    id: "fit_kb_008_volume_weekly_sets",
    domain: "fitness",
    topic: "weekly set volume",
    evidenceLevel: "umbrella_review",
    sourceLabel: "Frontiers 2022 hypertrophy review",
    sourceUrl: SOURCE_URLS.frontiers2022,
    principle:
      "Weekly hard-set volume is a major programming variable for hypertrophy and should be progressed within recovery capacity.",
    coachingUse:
      "Track weekly sets by target area and add volume only when completion, soreness, and performance support it.",
    appliesTo: ["hypertrophy", "muscle_gain", "bodybuilding"],
    avoidWhen: ["low_adherence", "acute_pain"],
    tags: ["volume", "weekly_sets", "hypertrophy", "progression"],
    confidence: "high"
  },
  {
    id: "fit_kb_009_beginner_controlled_volume",
    domain: "fitness",
    topic: "beginner volume",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "A beginner plan should start with controlled volume that the trainee can repeat consistently.",
    coachingUse:
      "Use modest exercise counts and avoid adding extra sets until technique and adherence are stable.",
    appliesTo: ["beginner", "low_completion", "low_adherence"],
    avoidWhen: [],
    tags: ["volume", "beginner", "adherence"],
    confidence: "medium"
  },
  {
    id: "fit_kb_010_volume_recovery_check",
    domain: "fitness",
    topic: "volume recovery check",
    evidenceLevel: "umbrella_review",
    sourceLabel: "Frontiers 2022 hypertrophy review",
    sourceUrl: SOURCE_URLS.frontiers2022,
    principle:
      "Volume decisions should account for recovery and performance, not only the target muscle.",
    coachingUse:
      "Hold or reduce volume when issues, poor completion, or persistent soreness appear.",
    appliesTo: ["recovery", "low_completion", "pain", "hypertrophy"],
    avoidWhen: [],
    tags: ["volume", "recovery", "deload", "progression"],
    confidence: "medium"
  },
  {
    id: "fit_kb_011_specialization_volume_tradeoff",
    domain: "fitness",
    topic: "specialization volume",
    evidenceLevel: "umbrella_review",
    sourceLabel: "Frontiers 2022 hypertrophy review",
    sourceUrl: SOURCE_URLS.frontiers2022,
    principle:
      "Specializing one region often requires managing total weekly work so recovery and balance are preserved.",
    coachingUse:
      "Bias priority muscles with a few extra hard sets while keeping non-priority patterns present.",
    appliesTo: ["hypertrophy", "bodybuilding", "lower_body_bias"],
    avoidWhen: ["low_adherence"],
    tags: ["volume", "specialization", "movement_balance"],
    confidence: "medium"
  },
  {
    id: "fit_kb_012_frequency_split_volume",
    domain: "fitness",
    topic: "training frequency",
    evidenceLevel: "umbrella_review",
    sourceLabel: "Frontiers 2022 hypertrophy review",
    sourceUrl: SOURCE_URLS.frontiers2022,
    principle:
      "Frequency is useful for distributing weekly volume and managing session quality.",
    coachingUse:
      "Spread hard sets across available days when a single session would become too dense.",
    appliesTo: ["hypertrophy", "weekly_sets", "intermediate", "advanced"],
    avoidWhen: [],
    tags: ["frequency", "volume", "session_quality"],
    confidence: "medium"
  },
  {
    id: "fit_kb_013_beginner_frequency_consistency",
    domain: "fitness",
    topic: "beginner frequency",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "For beginners, a repeatable weekly schedule is more useful than an ambitious split that is often missed.",
    coachingUse:
      "Prefer simple full-body or balanced templates that fit the saved training days.",
    appliesTo: ["beginner", "low_adherence", "no_history"],
    avoidWhen: [],
    tags: ["frequency", "beginner", "adherence"],
    confidence: "medium"
  },
  {
    id: "fit_kb_014_health_strengthening_frequency",
    domain: "fitness",
    topic: "health baseline",
    evidenceLevel: "federal_guideline",
    sourceLabel: "Physical Activity Guidelines for Americans",
    sourceUrl: SOURCE_URLS.pagAmericans,
    principle:
      "General health guidance includes regular muscle-strengthening activity as part of the activity baseline.",
    coachingUse:
      "Keep the plan sustainable and whole-body when the goal is general fitness or health.",
    appliesTo: ["general_fitness", "beginner", "health"],
    avoidWhen: [],
    tags: ["frequency", "health", "movement_balance"],
    confidence: "high"
  },
  {
    id: "fit_kb_015_progressive_overload_small_steps",
    domain: "fitness",
    topic: "progressive overload",
    evidenceLevel: "umbrella_review",
    sourceLabel: "Frontiers 2022 hypertrophy review",
    sourceUrl: SOURCE_URLS.frontiers2022,
    principle:
      "Progressive overload should use small changes in load, reps, sets, or execution quality over time.",
    coachingUse:
      "Progress one variable at a time after recent work is completed with stable technique.",
    appliesTo: ["hypertrophy", "strength", "beginner", "intermediate"],
    avoidWhen: ["acute_pain", "low_completion"],
    tags: ["progressive_overload", "progression", "technique"],
    confidence: "high"
  },
  {
    id: "fit_kb_016_progress_after_completion",
    domain: "fitness",
    topic: "progress after completion",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Progression should follow demonstrated completion, not just the calendar.",
    coachingUse:
      "When set completion is low, simplify or repeat before increasing load or volume.",
    appliesTo: ["low_completion", "low_adherence", "beginner"],
    avoidWhen: [],
    tags: ["progressive_overload", "adherence", "completion"],
    confidence: "medium"
  },
  {
    id: "fit_kb_017_deload_when_needed",
    domain: "fitness",
    topic: "deload decision",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "A deload or easier week is a coaching adjustment when recovery, pain, or completion data deteriorate.",
    coachingUse:
      "Reduce load, sets, or exercise difficulty before returning to normal progression.",
    appliesTo: ["recovery", "pain", "low_completion", "deload"],
    avoidWhen: [],
    tags: ["recovery", "deload", "progression"],
    confidence: "medium"
  },
  {
    id: "fit_kb_018_exercise_order_priority_first",
    domain: "fitness",
    topic: "exercise order",
    evidenceLevel: "umbrella_review",
    sourceLabel: "Frontiers 2022 hypertrophy review",
    sourceUrl: SOURCE_URLS.frontiers2022,
    principle:
      "Exercise order can support priority outcomes by placing important or technical work earlier.",
    coachingUse:
      "Put priority compound or skill-demanding movements before less important accessories.",
    appliesTo: ["hypertrophy", "strength", "priority_muscles"],
    avoidWhen: [],
    tags: ["exercise_order", "exercise_selection", "movement_balance"],
    confidence: "medium"
  },
  {
    id: "fit_kb_019_movement_pattern_balance",
    domain: "fitness",
    topic: "movement balance",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "A general Fitness Coach plan should retain push, pull, squat, hinge, core, and stability exposure unless safety requires otherwise.",
    coachingUse:
      "Use preference as emphasis, not permission to erase major movement patterns.",
    appliesTo: ["beginner", "general_fitness", "movement_balance", "female_beginner_lower_body_bias"],
    avoidWhen: [],
    tags: ["exercise_selection", "movement_balance", "beginner"],
    confidence: "medium"
  },
  {
    id: "fit_kb_020_lower_risk_substitutions",
    domain: "fitness",
    topic: "substitution safety",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Painful movement patterns should be substituted with lower-risk variants while preserving the training intent.",
    coachingUse:
      "For knee pain, prefer tolerable ranges, stable options, or non-painful hinge/glute patterns instead of forcing lunges.",
    appliesTo: ["pain", "knee_pain", "injury_limitation"],
    avoidWhen: [],
    tags: ["pain", "recovery", "substitution", "exercise_selection"],
    confidence: "medium"
  },
  {
    id: "fit_kb_021_equipment_matched_selection",
    domain: "fitness",
    topic: "equipment fit",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Exercise selection should match available equipment and avoid disliked or limited movements when alternatives exist.",
    coachingUse:
      "Keep suggestions inside saved equipment and preference constraints.",
    appliesTo: ["equipment", "beginner", "adherence"],
    avoidWhen: [],
    tags: ["exercise_selection", "adherence", "equipment"],
    confidence: "medium"
  },
  {
    id: "fit_kb_022_beginner_technique_first",
    domain: "fitness",
    topic: "beginner technique",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Beginner programming should prioritize repeatable technique and confidence before complex specialization.",
    coachingUse:
      "Use familiar patterns, stable exercises, and clear progression targets.",
    appliesTo: ["beginner", "no_history", "confidence_building"],
    avoidWhen: [],
    tags: ["beginner", "technique", "adherence"],
    confidence: "medium"
  },
  {
    id: "fit_kb_023_beginner_whole_body_base",
    domain: "fitness",
    topic: "beginner foundation",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Beginners benefit from a balanced foundation before narrow body-part specialization.",
    coachingUse:
      "Keep major lower-body, upper-body, and trunk patterns represented across the week.",
    appliesTo: ["beginner", "movement_balance", "general_fitness"],
    avoidWhen: [],
    tags: ["beginner", "movement_balance", "exercise_selection"],
    confidence: "medium"
  },
  {
    id: "fit_kb_024_beginner_recovery_margin",
    domain: "fitness",
    topic: "beginner recovery margin",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Beginner plans should leave enough recovery margin for learning, soreness management, and habit formation.",
    coachingUse:
      "Avoid max-effort density when there is little training history.",
    appliesTo: ["beginner", "no_history", "recovery"],
    avoidWhen: [],
    tags: ["beginner", "recovery", "adherence"],
    confidence: "medium"
  },
  {
    id: "fit_kb_025_female_beginner_lower_body_bias",
    domain: "fitness",
    topic: "female beginner lower-body bias",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "The female beginner default may bias glutes and legs while still preserving a balanced beginner plan.",
    coachingUse:
      "Add modest lower-body emphasis without removing push, pull, core, or shoulder-health work.",
    appliesTo: ["female", "beginner", "female_beginner_lower_body_bias", "lower_body_bias"],
    avoidWhen: ["advanced", "bodybuilding"],
    tags: ["female_beginner", "lower_body_bias", "movement_balance"],
    confidence: "medium"
  },
  {
    id: "fit_kb_026_upper_body_maintenance",
    domain: "fitness",
    topic: "upper-body maintenance",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "When upper-body width is not desired, upper-body work can stay at maintenance and stability emphasis.",
    coachingUse:
      "Keep back, shoulder, and chest work present without making upper-body hypertrophy the specialization target.",
    appliesTo: ["upper_body_maintenance", "avoid_upper_body_width", "female_beginner_lower_body_bias"],
    avoidWhen: ["bodybuilding", "upper_body_priority"],
    tags: ["female_beginner", "upper_body_maintenance", "movement_balance"],
    confidence: "medium"
  },
  {
    id: "fit_kb_027_glute_priority_not_exclusive",
    domain: "fitness",
    topic: "glute priority balance",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Glute or lower-body priority is an emphasis choice, not an instruction to make the plan lower-body only.",
    coachingUse:
      "Use priority lower-body work plus maintenance work for trunk and upper-body stability.",
    appliesTo: ["lower_body_bias", "glutes", "female_beginner_lower_body_bias"],
    avoidWhen: ["advanced", "bodybuilding"],
    tags: ["female_beginner", "lower_body_bias", "exercise_selection"],
    confidence: "medium"
  },
  {
    id: "fit_kb_028_pain_reduce_aggression",
    domain: "fitness",
    topic: "pain response",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Reported pain or limitations should reduce programming aggression until tolerance is clear.",
    coachingUse:
      "Avoid aggressive progression, failure, and high-density loading on painful patterns.",
    appliesTo: ["pain", "injury_limitation", "knee_pain"],
    avoidWhen: [],
    tags: ["pain", "recovery", "failure", "progression"],
    confidence: "medium"
  },
  {
    id: "fit_kb_029_recovery_health_baseline",
    domain: "fitness",
    topic: "recovery baseline",
    evidenceLevel: "federal_guideline",
    sourceLabel: "Physical Activity Guidelines for Americans",
    sourceUrl: SOURCE_URLS.pagAmericans,
    principle:
      "General activity guidance supports sustainable activity patterns over sporadic excessive workload.",
    coachingUse:
      "Keep recovery-friendly structure when adherence or health baseline is the main concern.",
    appliesTo: ["general_fitness", "low_adherence", "recovery"],
    avoidWhen: [],
    tags: ["recovery", "health", "adherence"],
    confidence: "medium"
  },
  {
    id: "fit_kb_030_adherence_simplify",
    domain: "fitness",
    topic: "adherence simplification",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Low adherence calls for a simpler plan before adding volume, novelty, or specialization.",
    coachingUse:
      "Reduce optional accessories and keep a short list of repeatable priority exercises.",
    appliesTo: ["low_adherence", "low_completion", "beginner"],
    avoidWhen: [],
    tags: ["adherence", "simplicity", "volume"],
    confidence: "medium"
  },
  {
    id: "fit_kb_031_adherence_preference_fit",
    domain: "fitness",
    topic: "preference fit",
    evidenceLevel: "coaching_rule",
    sourceLabel: "Coach intake product rule + general resistance training evidence",
    sourceId: COACHING_RULE_SOURCE_ID,
    principle:
      "Preference fit can support adherence when it does not conflict with safety or movement balance.",
    coachingUse:
      "Favor liked, available, and confidence-building options within the deterministic exercise library.",
    appliesTo: ["adherence", "equipment", "confidence_building"],
    avoidWhen: [],
    tags: ["adherence", "exercise_selection", "preference"],
    confidence: "medium"
  },
  {
    id: "fit_kb_032_pregnancy_safety",
    domain: "fitness",
    topic: "pregnancy safety",
    evidenceLevel: "clinical_guidance",
    sourceLabel: "ACOG pregnancy/postpartum guidance",
    sourceUrl: SOURCE_URLS.acog2020,
    principle:
      "Pregnancy exercise guidance should prioritize individualized safety, warning signs, and appropriate clinical clearance.",
    coachingUse:
      "Only surface pregnancy-specific safety handling when pregnancy is explicitly present in context.",
    appliesTo: ["pregnancy"],
    avoidWhen: [],
    tags: ["pregnancy", "safety", "clinical_boundary"],
    confidence: "high"
  },
  {
    id: "fit_kb_033_postpartum_return",
    domain: "fitness",
    topic: "postpartum return",
    evidenceLevel: "clinical_guidance",
    sourceLabel: "ACOG pregnancy/postpartum guidance",
    sourceUrl: SOURCE_URLS.acog2020,
    principle:
      "Postpartum training should return gradually and respect recovery, symptoms, and clinical context.",
    coachingUse:
      "Only surface postpartum-specific safety handling when postpartum status is explicitly present in context.",
    appliesTo: ["postpartum"],
    avoidWhen: [],
    tags: ["postpartum", "safety", "clinical_boundary"],
    confidence: "high"
  },
  {
    id: "fit_kb_034_supplement_safety_scope",
    domain: "fitness",
    topic: "supplement safety scope",
    evidenceLevel: "fact_sheet",
    sourceLabel: "NIH ODS exercise/performance supplement fact sheet",
    sourceUrl: SOURCE_URLS.nihOds,
    principle:
      "Performance supplement guidance belongs in a safety and evidence discussion, not as workout-plan structure.",
    coachingUse:
      "Only surface supplement safety when supplement use or questions are explicitly present.",
    appliesTo: ["supplement_context"],
    avoidWhen: [],
    tags: ["supplement", "safety", "scope"],
    confidence: "high"
  },
  {
    id: "fit_kb_035_supplement_no_plan_driver",
    domain: "fitness",
    topic: "supplements not plan driver",
    evidenceLevel: "fact_sheet",
    sourceLabel: "NIH ODS exercise/performance supplement fact sheet",
    sourceUrl: SOURCE_URLS.nihOds,
    principle:
      "Supplements should not replace training consistency, recovery, nutrition basics, or safety screening.",
    coachingUse:
      "Do not use supplement facts to determine deterministic exercise selection.",
    appliesTo: ["supplement_context"],
    avoidWhen: [],
    tags: ["supplement", "safety", "adherence"],
    confidence: "high"
  }
];

module.exports = {
  COACHING_RULE_SOURCE_ID,
  FITNESS_KNOWLEDGE_BASE_VERSION,
  FITNESS_KNOWLEDGE_ITEMS,
  LAST_PROFESSIONAL_REVIEWED_AT,
  PROFESSIONAL_RULES,
  PROFESSIONAL_SOURCE_ITEMS,
  SOURCE_URLS
};
