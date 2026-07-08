import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import {
  createTraineeProfile,
  getAISpecialists,
  getStoredUser,
  getTraineeProfile,
  suggestWorkoutPlan,
  updateTraineeProfile
} from "../services/api";

const emptyForm = {
  goal: "muscle gain",
  level: "beginner",
  age: "",
  weight: "",
  height: "",
  biologicalSex: "",
  trainingDaysPerWeek: "3",
  preferredStyle: "balanced strength and conditioning",
  equipmentAccess: "",
  injuries: "",
  limitations: "",
  likedExercises: "",
  dislikedExercises: "",
  specialtyFocus: "",
  specialtyNotes: "",
  freeTextNotes: ""
};

function toText(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function toList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const textFieldMessage =
  "Use fitness-related text only; remove links, emails, websites, or unrelated requests.";

const textFields = [
  "equipmentAccess",
  "injuries",
  "limitations",
  "likedExercises",
  "dislikedExercises",
  "specialtyFocus",
  "specialtyNotes",
  "freeTextNotes"
];

function hasJunkText(value) {
  const text = String(value || "").trim();

  if (!text) {
    return false;
  }

  return [
    /https?:\/\//i,
    /\bwww\./i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\bstack\s*overflow\b/i,
    /\bstackoverflow\b/i,
    /\bgithub\b/i,
    /\bchatgpt\b/i,
    /\bplease\s+(go|visit|open|search|look up|google|browse|click)\b/i,
    /```|<script|select\s+\*|drop\s+table|console\.log/i
  ].some((pattern) => pattern.test(text));
}

function validateNumberField(value, min, max, label, wholeNumber = false) {
  if (String(value || "").trim() === "") {
    return `${label} is required.`;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return `${label} must be between ${min} and ${max}.`;
  }

  if (wholeNumber && !Number.isInteger(parsed)) {
    return `${label} must be a whole number.`;
  }

  return "";
}

function validateOnboardingForm(form) {
  const errors = {};

  const ageError = validateNumberField(form.age, 10, 100, "Age", true);
  const weightError = validateNumberField(form.weight, 30, 350, "Weight");
  const heightError = validateNumberField(form.height, 100, 250, "Height");

  if (ageError) errors.age = ageError;
  if (weightError) errors.weight = weightError;
  if (heightError) errors.height = heightError;

  textFields.forEach((field) => {
    if (hasJunkText(form[field])) {
      errors[field] = textFieldMessage;
    }
  });

  return errors;
}

function specialtyPrompt(specialty) {
  switch (specialty) {
    case "strength training":
      return "Preferred lifts, equipment, and exercise variations";
    case "running":
      return "Distance preference, terrain, and running limitations";
    case "football":
    case "basketball":
      return "Position, speed/agility focus, and sport-specific limitations";
    case "weight loss":
      return "Impact tolerance, schedule consistency, and training preferences";
    default:
      return "Training preferences the AI guidance should consider";
  }
}

function roleDescription(specialist) {
  if (specialist?.isWorkoutAssignable) {
    return "Selected for workout planning.";
  }

  if (specialist?.isNutritionAvailable) {
    return "Used for Nutrition/NutriScan guidance.";
  }

  return "Future development.";
}

function Onboarding() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const [form, setForm] = useState(emptyForm);
  const [aiSpecialists, setAiSpecialists] = useState([]);
  const [aiCoach, setAiCoach] = useState(null);
  const [selectedAiSpecialistId, setSelectedAiSpecialistId] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    async function loadOnboarding() {
      setStatus("loading");
      setError("");

      try {
        const [profile, specialistData] = await Promise.all([
          getTraineeProfile(storedUser.userId),
          getAISpecialists()
        ]);
        const specialists = Array.isArray(specialistData) ? specialistData : [];
        const availableFitnessCoach = specialists.find(
          (specialist) => specialist.isWorkoutAssignable
        );

        setAiSpecialists(specialists);

        if (profile) {
          const assignedSpecialistId =
            profile.aiSpecialistId || profile.AiSpecialist?.specialistId || "";
          const assignedFitnessCoach = specialists.find(
            (specialist) =>
              specialist.isWorkoutAssignable &&
              String(specialist.specialistId) === String(assignedSpecialistId)
          );
          const selectedFitnessCoach = assignedFitnessCoach || availableFitnessCoach || null;

          setSelectedAiSpecialistId(
            selectedFitnessCoach ? String(selectedFitnessCoach.specialistId) : ""
          );
          setAiCoach(selectedFitnessCoach || profile.AiSpecialist || null);
          setHasProfile(true);
          setForm({
            goal: profile.goal || emptyForm.goal,
            level: profile.level || emptyForm.level,
            age: profile.age || "",
            weight: profile.weight || "",
            height: profile.height || "",
            biologicalSex: profile.biologicalSex || "",
            trainingDaysPerWeek: String(profile.trainingDaysPerWeek || 3),
            preferredStyle: profile.preferredStyle || emptyForm.preferredStyle,
            equipmentAccess: toText(profile.equipmentAccess),
            injuries: toText(profile.injuries),
            limitations: toText(profile.limitations),
            likedExercises: toText(profile.likedExercises),
            dislikedExercises: toText(profile.dislikedExercises),
            specialtyFocus: profile.specialtyPreferences?.focus || "",
            specialtyNotes: profile.specialtyPreferences?.notes || "",
            freeTextNotes: profile.freeTextNotes || ""
          });
        } else {
          setSelectedAiSpecialistId(
            availableFitnessCoach ? String(availableFitnessCoach.specialistId) : ""
          );
          setAiCoach(availableFitnessCoach || null);
        }

        setStatus("ready");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    if (storedUser?.userRole === "trainee") {
      loadOnboarding();
    } else {
      setError("Only trainee users can edit a fitness profile.");
      setStatus("error");
    }
  }, [storedUser?.userId, storedUser?.userRole]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  function profilePayload() {
    const selectedWorkoutSpecialist = aiSpecialists.find(
      (specialist) =>
        specialist.isWorkoutAssignable &&
        String(specialist.specialistId) === String(selectedAiSpecialistId)
    );

    return {
      userId: storedUser.userId,
      aiSpecialistId: selectedWorkoutSpecialist
        ? Number(selectedWorkoutSpecialist.specialistId)
        : null,
      goal: form.goal,
      level: form.level,
      age: form.age ? Number(form.age) : null,
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      biologicalSex: form.biologicalSex || null,
      trainingDaysPerWeek: Number(form.trainingDaysPerWeek),
      preferredStyle: form.preferredStyle,
      equipmentAccess: toList(form.equipmentAccess),
      injuries: toList(form.injuries),
      limitations: toList(form.limitations),
      likedExercises: toList(form.likedExercises),
      dislikedExercises: toList(form.dislikedExercises),
      specialtyPreferences: {
        aiCoachSpecialty: selectedWorkoutSpecialist?.specialty || "general fitness",
        focus: form.specialtyFocus,
        notes: form.specialtyNotes
      },
      freeTextNotes: form.freeTextNotes
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateOnboardingForm(form);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setError("Please fix the highlighted profile fields before saving.");
      setStatus("ready");
      return;
    }

    setStatus("saving");
    setError("");

    try {
      if (hasProfile) {
        await updateTraineeProfile(storedUser.userId, profilePayload());
      } else {
        await createTraineeProfile(profilePayload());
      }

      await suggestWorkoutPlan(storedUser.userId);
      navigate("/training", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return <LoadingState label="Loading fitness profile..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  const selectedAiCoach =
    aiSpecialists.find(
      (specialist) => String(specialist.specialistId) === String(selectedAiSpecialistId)
    ) || aiCoach;
  const workoutSpecialistOptions = aiSpecialists.filter(
    (specialist) =>
      specialist.isWorkoutAssignable ||
      String(specialist.domain || "").toLowerCase() === "training"
  );

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Fitness Profile"
        title={hasProfile ? "Edit Fitness Profile" : "Complete Onboarding"}
        description="Share training context so the app can refresh your personalized workout plan."
      />

      <section className="onboarding-progress" aria-label="Fitness profile steps">
        <article>
          <span>01</span>
          <strong>Training goal</strong>
          <p>Goal, level, schedule</p>
        </article>
        <article>
          <span>02</span>
          <strong>Body context</strong>
          <p>Equipment, safety, limits</p>
        </article>
        <article>
          <span>03</span>
          <strong>AI guidance context</strong>
          <p>Preferences and specialty focus</p>
        </article>
      </section>

      {error ? <ErrorState message={error} /> : null}

      <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
        <section className="settings-page onboarding-step">
          <div className="section-heading">
            <p className="eyebrow">Training basics</p>
            <h2>Goals and schedule</h2>
            <p>Set the core inputs that shape your generated plan.</p>
          </div>

          <label>
            Goal
            <select name="goal" value={form.goal} onChange={handleChange}>
              <option value="muscle gain">Muscle gain</option>
              <option value="fat loss">Fat loss</option>
              <option value="strength">Strength</option>
              <option value="endurance">Endurance</option>
              <option value="general fitness">General fitness</option>
            </select>
          </label>

          <label>
            Level
            <select name="level" value={form.level} onChange={handleChange}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <label>
            Training days per week
            <input
              name="trainingDaysPerWeek"
              type="number"
              min="1"
              max="7"
              value={form.trainingDaysPerWeek}
              onChange={handleChange}
            />
          </label>

          <label>
            Preferred workout style
            <select name="preferredStyle" value={form.preferredStyle} onChange={handleChange}>
              <option value="balanced strength and conditioning">Balanced strength and conditioning</option>
              <option value="short sessions">Short sessions</option>
              <option value="hypertrophy focus">Hypertrophy focus</option>
              <option value="low impact">Low impact</option>
              <option value="sport performance">Sport performance</option>
            </select>
          </label>
        </section>

        <section className="settings-page onboarding-step">
          <div className="section-heading">
            <p className="eyebrow">Body and safety</p>
            <h2>Context for the plan</h2>
            <p>Help the system avoid poor exercise choices.</p>
          </div>

          <div className="compact-form-grid">
            <label>
              Age
              <input
                name="age"
                type="number"
                min="10"
                max="100"
                required
                value={form.age}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.age)}
              />
              {fieldErrors.age ? <span className="field-error">{fieldErrors.age}</span> : null}
            </label>
            <label>
              Weight (kg)
              <input
                name="weight"
                type="number"
                min="30"
                max="350"
                step="0.1"
                required
                value={form.weight}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.weight)}
              />
              {fieldErrors.weight ? <span className="field-error">{fieldErrors.weight}</span> : null}
            </label>
            <label>
              Height (cm)
              <input
                name="height"
                type="number"
                min="100"
                max="250"
                step="0.1"
                required
                value={form.height}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.height)}
              />
              {fieldErrors.height ? <span className="field-error">{fieldErrors.height}</span> : null}
            </label>
          </div>

          <label>
            Equipment access
            <input
              name="equipmentAccess"
              value={form.equipmentAccess}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.equipmentAccess)}
              placeholder="barbell, dumbbells, cables, treadmill"
            />
            {fieldErrors.equipmentAccess ? (
              <span className="field-error">{fieldErrors.equipmentAccess}</span>
            ) : null}
          </label>

          <label>
            Injuries
            <input
              name="injuries"
              value={form.injuries}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.injuries)}
              placeholder="shoulder pain, knee history"
            />
            {fieldErrors.injuries ? <span className="field-error">{fieldErrors.injuries}</span> : null}
          </label>

          <label>
            Limitations
            <input
              name="limitations"
              value={form.limitations}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.limitations)}
              placeholder="low impact only, limited time"
            />
            {fieldErrors.limitations ? (
              <span className="field-error">{fieldErrors.limitations}</span>
            ) : null}
          </label>
        </section>

        <section className="settings-page onboarding-step onboarding-step--featured">
          <div className="section-heading">
            <p className="eyebrow">{selectedAiCoach?.specialty || "AI guidance preferences"}</p>
            <h2>{specialtyPrompt(selectedAiCoach?.specialty)}</h2>
            <p>
              {selectedAiCoach?.isWorkoutAssignable
                ? `${selectedAiCoach.name} will use this context when shaping your workout plan.`
                : "Choose the available Fitness Coach for workout planning. The Nutritionist is available separately for Nutrition/NutriScan guidance."}
            </p>
          </div>

          <div className="specialist-choice-group">
            <div>
              <p className="eyebrow">Choose your Fitness Coach</p>
              <h3>Workout planning specialist</h3>
            </div>
            {workoutSpecialistOptions.length === 0 ? (
              <p className="specialist-choice-empty">No Fitness Coach is configured yet.</p>
            ) : (
              <div className="specialist-choice-grid">
                {workoutSpecialistOptions.map((specialist) => {
                  const selectable = specialist.isWorkoutAssignable;
                  const selected =
                    selectable &&
                    String(specialist.specialistId) === String(selectedAiSpecialistId);
                  const statusText =
                    specialist.availabilityLabel ||
                    (selectable ? "Available Fitness Coach" : "Coming soon");

                  return (
                    <button
                      key={specialist.specialistId}
                      type="button"
                      className={`specialist-choice-card ${
                        selected ? "specialist-choice-card--selected" : ""
                      }`}
                      disabled={!selectable}
                      aria-pressed={selectable ? selected : undefined}
                      onClick={() => {
                        setSelectedAiSpecialistId(String(specialist.specialistId));
                        setAiCoach(specialist);
                      }}
                    >
                      <span>{statusText}</span>
                      <strong>{specialist.name}</strong>
                      <small>{roleDescription(specialist)}</small>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="specialist-choice-note">
              Nutritionist AI is ready in Nutrition/NutriScan. No setup choice is needed here.
            </p>
          </div>

          <label>
            Exercises you like
            <input
              name="likedExercises"
              value={form.likedExercises}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.likedExercises)}
              placeholder="squats, rowing, incline press"
            />
            {fieldErrors.likedExercises ? (
              <span className="field-error">{fieldErrors.likedExercises}</span>
            ) : null}
          </label>

          <label>
            Exercises you dislike
            <input
              name="dislikedExercises"
              value={form.dislikedExercises}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.dislikedExercises)}
              placeholder="burpees, running, overhead press"
            />
            {fieldErrors.dislikedExercises ? (
              <span className="field-error">{fieldErrors.dislikedExercises}</span>
            ) : null}
          </label>

          <label>
            Specialty focus
            <input
              name="specialtyFocus"
              value={form.specialtyFocus}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.specialtyFocus)}
              placeholder="upper body strength, speed, fat loss consistency"
            />
            {fieldErrors.specialtyFocus ? (
              <span className="field-error">{fieldErrors.specialtyFocus}</span>
            ) : null}
          </label>

          <label>
            Guidance notes
            <input
              name="specialtyNotes"
              value={form.specialtyNotes}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.specialtyNotes)}
              placeholder="Anything the workout generator should consider"
            />
            {fieldErrors.specialtyNotes ? (
              <span className="field-error">{fieldErrors.specialtyNotes}</span>
            ) : null}
          </label>

          <label>
            Free-text notes
            <input
              name="freeTextNotes"
              value={form.freeTextNotes}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.freeTextNotes)}
              placeholder="Schedule, preferences, recovery, motivation"
            />
            {fieldErrors.freeTextNotes ? (
              <span className="field-error">{fieldErrors.freeTextNotes}</span>
            ) : null}
          </label>

          <button type="submit" className="button button--primary" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save Profile and Refresh Plan"}
          </button>
        </section>
      </form>
    </div>
  );
}

export default Onboarding;
