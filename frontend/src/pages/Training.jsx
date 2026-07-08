import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import WorkoutPlanCard from "../components/WorkoutPlanCard";
import {
  getActiveWorkoutSession,
  getStoredUser,
  getWeeklyFitnessReview,
  getWorkoutPlans,
  getWorkoutSessions,
  sendWeeklyFitnessCheckIn,
  suggestWorkoutPlan
} from "../services/api";
import { createWorkoutSocket } from "../services/socket";

function formatGoal(goal) {
  return String(goal || "Training")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function noteValue(notes, label, fallback = "Not set") {
  const match = String(notes || "").match(new RegExp(`${label}:\\s*([^.]*)\\.`, "i"));
  return match?.[1]?.trim() || fallback;
}

function listText(value, fallback = "None") {
  return value && value !== "none" ? value : fallback;
}

function reviewTone(reviewDecision) {
  if (reviewDecision === "needs_review") return "review";
  if (reviewDecision === "minor_adjustments") return "adjust";
  if (reviewDecision === "collect_more_data") return "data";
  return "steady";
}

function formatReviewLabel(value) {
  return String(value || "preview")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const PUBLIC_SIGNAL_LABELS = {
  pain_signal: "Pain",
  fatigue_signal: "Fatigue",
  equipment_unavailable: "Equipment",
  time_constraint: "Time",
  too_hard: "Too hard",
  too_easy: "Too easy",
  felt_good: "Felt good",
  focus_preference: "Focus request",
  motivation: "Motivation",
  recurring_check_in_pain: "Recurring pain",
  repeated_time_constraint: "Time pattern",
  repeated_fatigue_signal: "Fatigue pattern",
  repeated_equipment_constraint: "Equipment pattern"
};

function publicSignalLabel(signal) {
  return PUBLIC_SIGNAL_LABELS[signal] || formatReviewLabel(signal);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

const WEEKLY_CHECK_IN_TAGS = [
  { label: "Too hard", value: "too_hard" },
  { label: "Too easy", value: "too_easy" },
  { label: "Pain", value: "pain_signal" },
  { label: "Fatigue", value: "fatigue_signal" },
  { label: "No equipment", value: "no_equipment" },
  { label: "Felt good", value: "felt_good" },
  { label: "Want more focus", value: "want_more_focus" }
];

function getPlanExercises(plan) {
  if (Array.isArray(plan?.assignments) && plan.assignments.length > 0) {
    return plan.assignments.map((assignment) => ({
      ...(assignment.exercise || {}),
      exerciseId: assignment.exerciseId,
      dayLabel: assignment.dayLabel,
      dayNumber: assignment.dayNumber,
      orderIndex: assignment.orderIndex,
      targetSets: assignment.targetSets,
      targetReps: assignment.targetReps,
      workoutPlanExerciseId: assignment.workoutPlanExerciseId
    })).filter((exercise) => exercise.name);
  }

  if (Array.isArray(plan?.exercises)) {
    return plan.exercises;
  }

  if (Array.isArray(plan?.WorkoutPlanExercises)) {
    return plan.WorkoutPlanExercises.map((assignment) => ({
      ...(assignment.Exercise || {}),
      dayLabel: assignment.dayLabel,
      orderIndex: assignment.orderIndex,
      targetSets: assignment.targetSets,
      targetReps: assignment.targetReps
    })).filter((exercise) => exercise.name);
  }

  return [];
}

function isGeneratedPlan(plan) {
  return String(plan?.notes || "").startsWith("[ONBOARDING_SUGGESTED_PLAN]");
}

function resolveRestoredDayLabel(plan, session) {
  const planExercises = getPlanExercises(plan);
  const savedDayLabel = String(session?.selectedDayLabel || "").trim();

  if (
    savedDayLabel &&
    planExercises.some((exercise) => exercise.dayLabel === savedDayLabel)
  ) {
    return savedDayLabel;
  }

  const loggedExerciseIds = new Set(
    (Array.isArray(session?.SetLogs) ? session.SetLogs : []).map((log) =>
      String(log.exerciseId)
    )
  );

  if (loggedExerciseIds.size === 0) {
    return "";
  }

  const dayGroups = new Map();

  planExercises.forEach((exercise) => {
    const current = dayGroups.get(exercise.dayLabel) || [];
    current.push(exercise);
    dayGroups.set(exercise.dayLabel, current);
  });

  const matchingDays = Array.from(dayGroups.entries()).filter(([, exercises]) => {
    const dayExerciseIds = new Set(
      exercises.map((exercise) => String(exercise.exerciseId))
    );
    return Array.from(loggedExerciseIds).every((exerciseId) =>
      dayExerciseIds.has(exerciseId)
    );
  });
  const exactTotalMatch = matchingDays.find(([, exercises]) => {
    const plannedSets = exercises.reduce(
      (total, exercise) => total + Number(exercise.targetSets || 0),
      0
    );
    return plannedSets === Number(session?.totalSets || 0);
  });

  return exactTotalMatch?.[0] || matchingDays[0]?.[0] || "";
}

function ExercisePreview({ exercise }) {
  if (exercise?.imageUrl) {
    return <img className="active-exercise-image" src={exercise.imageUrl} alt="" loading="lazy" />;
  }

  return (
    <div className="active-exercise-image active-exercise-image--fallback" aria-hidden="true">
      {String(exercise?.name || "VS").slice(0, 2).toUpperCase()}
    </div>
  );
}

function formatSetTime(value) {
  return value
    ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
}

function ActiveExerciseSets({ exercises, setLogs }) {
  return (
    <div className="active-exercise-log-list">
      {exercises.map((exercise) => {
        const exerciseLogs = setLogs
          .filter((log) => String(log.exerciseId) === String(exercise.exerciseId))
          .slice()
          .sort((left, right) => left.setNumber - right.setNumber);

        return (
          <section className="active-exercise-log" key={exercise.exerciseId}>
            <div className="active-exercise-log__heading">
              <strong>{exercise.name}</strong>
              <span>
                {exerciseLogs.length} / {exercise.targetSets || "—"} sets
              </span>
            </div>
            {exerciseLogs.length > 0 ? (
              <div className="active-set-table-shell">
                <table className="active-set-table">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>Weight</th>
                      <th>Reps</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exerciseLogs.map((log) => (
                      <tr key={log.setLogId}>
                        <td>{log.setNumber}</td>
                        <td>{log.weight} kg</td>
                        <td>{log.reps}</td>
                        <td>{formatSetTime(log.logDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <small>No sets logged yet.</small>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Training() {
  const [data, setData] = useState({ workoutPlans: [] });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [finishedWorkouts, setFinishedWorkouts] = useState([]);
  const [coachResponses, setCoachResponses] = useState([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState("");
  const [previewExerciseId, setPreviewExerciseId] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [issueText, setIssueText] = useState("");
  const [planActionStatus, setPlanActionStatus] = useState("idle");
  const [restoreError, setRestoreError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [weeklyReviewStatus, setWeeklyReviewStatus] = useState("idle");
  const [weeklyReviewError, setWeeklyReviewError] = useState("");
  const [weeklyCheckInAnswers, setWeeklyCheckInAnswers] = useState({});
  const [weeklyCheckInGeneralNote, setWeeklyCheckInGeneralNote] = useState("");
  const [weeklyCheckInSelectedTags, setWeeklyCheckInSelectedTags] = useState([]);
  const [weeklyCheckInSignals, setWeeklyCheckInSignals] = useState([]);
  const [weeklyCheckInStatus, setWeeklyCheckInStatus] = useState("idle");
  const [weeklyCheckInMessage, setWeeklyCheckInMessage] = useState("");
  const [weeklyCheckInError, setWeeklyCheckInError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [setForm, setSetForm] = useState({
    exerciseId: "",
    setNumber: "1",
    weight: "0",
    reps: "10"
  });
  const socketRef = useRef(null);
  const activePanelRef = useRef(null);
  const sessionDayExercisesRef = useRef([]);
  const storedUser = getStoredUser();
  const weeklyCoachQuestions = useMemo(
    () => (Array.isArray(weeklyReview?.coachQuestions) ? weeklyReview.coachQuestions.slice(0, 3) : []),
    [weeklyReview]
  );
  const weeklyReviewActions = useMemo(
    () => (Array.isArray(weeklyReview?.reviewActions) ? weeklyReview.reviewActions.slice(0, 3) : []),
    [weeklyReview]
  );
  const weeklyReviewSignals = useMemo(() => {
    const knownReasonCodes = (Array.isArray(weeklyReview?.reasonCodes) ? weeklyReview.reasonCodes : [])
      .filter((code) => PUBLIC_SIGNAL_LABELS[code]);
    return uniqueValues([...weeklyCheckInSignals, ...knownReasonCodes]).slice(0, 5);
  }, [weeklyCheckInSignals, weeklyReview]);
  const hasWeeklyCheckInAnswer = weeklyCoachQuestions.some((question) =>
    String(weeklyCheckInAnswers[question] || "").trim()
  );
  const hasWeeklyCheckInInput =
    hasWeeklyCheckInAnswer ||
    String(weeklyCheckInGeneralNote || "").trim() ||
    weeklyCheckInSelectedTags.length > 0;

  useEffect(() => {
    async function loadTraining() {
      setStatus("loading");
      setError("");
      setWeeklyReviewStatus("loading");
      setWeeklyReviewError("");

      try {
        const [plansResult, restoreResult, historyResult, reviewResult] = await Promise.allSettled([
          getWorkoutPlans(),
          storedUser?.userId
            ? getActiveWorkoutSession(storedUser.userId)
            : Promise.resolve(null),
          storedUser?.userId
            ? getWorkoutSessions(storedUser.userId)
            : Promise.resolve([]),
          storedUser?.userId
            ? getWeeklyFitnessReview(storedUser.userId)
            : Promise.resolve(null)
        ]);
        if (plansResult.status === "rejected") {
          throw plansResult.reason;
        }

        const workoutPlans = plansResult.value;
        const restoredWorkout = restoreResult.status === "fulfilled" ? restoreResult.value : null;
        const workoutHistory = historyResult.status === "fulfilled" ? historyResult.value : [];
        setData({ workoutPlans });
        setFinishedWorkouts(workoutHistory);
        setRestoreError(restoreResult.status === "rejected" ? restoreResult.reason.message : "");
        setHistoryError(historyResult.status === "rejected" ? historyResult.reason.message : "");
        setWeeklyReview(reviewResult.status === "fulfilled" ? reviewResult.value : null);
        setWeeklyReviewError(reviewResult.status === "rejected" ? reviewResult.reason.message : "");
        setWeeklyReviewStatus(reviewResult.status === "rejected" ? "error" : "success");

        if (restoredWorkout) {
          const restoredPlan = workoutPlans.find(
            (plan) =>
              String(plan.planId) === String(restoredWorkout.workoutPlanId)
          );
          const restoredDayLabel = resolveRestoredDayLabel(
            restoredPlan,
            restoredWorkout
          );
          const restoredExercises = getPlanExercises(restoredPlan)
            .filter((exercise) => exercise.dayLabel === restoredDayLabel)
            .sort((left, right) => left.orderIndex - right.orderIndex);
          const restoredLogs = Array.isArray(restoredWorkout.SetLogs)
            ? restoredWorkout.SetLogs
            : [];
          const restoredExercise =
            restoredExercises.find((exercise) => {
              const loggedSets = restoredLogs.filter(
                (log) => String(log.exerciseId) === String(exercise.exerciseId)
              ).length;
              return loggedSets < Number(exercise.targetSets || 0);
            }) ||
            restoredExercises[0] ||
            null;
          const restoredSetCount = restoredExercise
            ? restoredLogs.filter(
                (log) =>
                  String(log.exerciseId) === String(restoredExercise.exerciseId)
              ).length
            : 0;

          setActiveWorkout({
            ...restoredWorkout,
            selectedDayLabel: restoredDayLabel
          });
          setSelectedDayLabel(restoredDayLabel);
          setSetForm((current) => ({
            ...current,
            exerciseId: restoredExercise ? String(restoredExercise.exerciseId) : "",
            setNumber: String(restoredSetCount + 1)
          }));
        }

        setStatus("success");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    loadTraining();
  }, []);

  async function refreshWeeklyReview() {
    if (!storedUser?.userId) {
      return;
    }

    setWeeklyReviewStatus("loading");
    setWeeklyReviewError("");
    setWeeklyCheckInMessage("");
    setWeeklyCheckInError("");
    setWeeklyCheckInSignals([]);

    try {
      const review = await getWeeklyFitnessReview(storedUser.userId);
      setWeeklyReview(review);
      setWeeklyReviewStatus("success");
    } catch (requestError) {
      setWeeklyReviewError(requestError.message);
      setWeeklyReviewStatus("error");
    }
  }

  function updateWeeklyCheckInAnswer(question, answer) {
    setWeeklyCheckInAnswers((current) => ({
      ...current,
      [question]: answer
    }));
    setWeeklyCheckInMessage("");
    setWeeklyCheckInError("");
  }

  function updateWeeklyCheckInGeneralNote(note) {
    setWeeklyCheckInGeneralNote(note);
    setWeeklyCheckInMessage("");
    setWeeklyCheckInError("");
  }

  function toggleWeeklyCheckInTag(tag) {
    setWeeklyCheckInSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
    setWeeklyCheckInMessage("");
    setWeeklyCheckInError("");
  }

  async function submitWeeklyCheckIn() {
    if (!storedUser?.userId) {
      return;
    }

    const answers = weeklyCoachQuestions
      .map((question) => ({
        question,
        answer: String(weeklyCheckInAnswers[question] || "").trim()
      }))
      .filter((item) => item.answer);
    const generalNote = String(weeklyCheckInGeneralNote || "").trim();

    if (answers.length === 0 && !generalNote && weeklyCheckInSelectedTags.length === 0) {
      return;
    }

    setWeeklyCheckInStatus("loading");
    setWeeklyCheckInMessage("");
    setWeeklyCheckInError("");

    try {
      const result = await sendWeeklyFitnessCheckIn(storedUser.userId, {
        answers,
        generalNote,
        selectedTags: weeklyCheckInSelectedTags
      });
      if (result?.preview) {
        setWeeklyReview(result.preview);
      }
      setWeeklyCheckInSignals(Array.isArray(result?.parsedSignals) ? result.parsedSignals : []);
      setWeeklyCheckInStatus("success");
      setWeeklyCheckInMessage(result?.message || "Coach will use this for next week.");
    } catch (requestError) {
      setWeeklyCheckInStatus("error");
      setWeeklyCheckInError(requestError.message);
    }
  }

  useEffect(() => {
    const socket = createWorkoutSocket("trainee");
    socketRef.current = socket;

    socket.on("workout:started", (session) => {
      setPendingAction("");
      setSelectedDayLabel((currentDayLabel) => {
        const resolvedDayLabel = session.selectedDayLabel || currentDayLabel;
        setActiveWorkout({
          ...session,
          selectedDayLabel: resolvedDayLabel
        });
        return resolvedDayLabel;
      });
      setLiveMessage("Workout started and coach dashboard was notified.");
    });

    socket.on("setLog:created", (setLog) => {
      setPendingAction("");
      setLiveMessage("Set saved and sent to coach dashboard.");
      setActiveWorkout((current) => {
        if (!current) return current;
        const logs = [...(current.SetLogs || []), setLog];
        const exercises = sessionDayExercisesRef.current;
        const currentIndex = exercises.findIndex(
          (exercise) => String(exercise.exerciseId) === String(setLog.exerciseId)
        );
        const exercise = exercises[currentIndex];
        const exerciseLogCount = logs.filter(
          (log) => String(log.exerciseId) === String(setLog.exerciseId)
        ).length;
        const nextIncomplete = exercises
          .slice(currentIndex + 1)
          .find((candidate) =>
            logs.filter((log) => String(log.exerciseId) === String(candidate.exerciseId)).length <
            Number(candidate.targetSets || 0)
          );

        setSetForm((form) => ({
          ...form,
          exerciseId:
            exercise && exerciseLogCount >= Number(exercise.targetSets || 0) && nextIncomplete
              ? String(nextIncomplete.exerciseId)
              : form.exerciseId,
          setNumber:
            exercise && exerciseLogCount >= Number(exercise.targetSets || 0) && nextIncomplete
              ? String(
                  logs.filter(
                    (log) => String(log.exerciseId) === String(nextIncomplete.exerciseId)
                  ).length + 1
                )
              : String(exerciseLogCount + 1)
        }));
        return { ...current, SetLogs: logs };
      });
    });

    socket.on("workout:progressUpdated", (progress) => {
      setActiveWorkout((current) => (current ? { ...current, ...progress } : current));
    });

    socket.on("workout:issueReported", (issue) => {
      setPendingAction("");
      if (!issue.error) {
        setLiveMessage("Issue reported to coach dashboard in real time.");
      }
    });

    socket.on("workout:error", (errorPayload) => {
      setPendingAction("");
      setLiveMessage(errorPayload?.message || "Workout update could not be completed.");
    });

    socket.on("workout:coachResponse", (response) => {
      if (response?.error) {
        setLiveMessage(response.message || "Coach response could not be delivered.");
        return;
      }

      const receivedResponse = {
        ...response,
        sentAt: response.sentAt || new Date().toISOString()
      };
      setCoachResponses((current) => [receivedResponse, ...current].slice(0, 3));
      setLiveMessage("New coach response received.");
    });

    socket.on("workout:finished", (session) => {
      setPendingAction("");
      setActiveWorkout(null);
      setFinishedWorkouts((current) => [
        session,
        ...current.filter(
          (workout) => workout.workoutSessionId !== session.workoutSessionId
        )
      ]);
      setLiveMessage("Workout finished and coach dashboard was updated.");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const visibleWorkoutPlans = useMemo(() => {
    if (!storedUser?.userId) {
      return data.workoutPlans;
    }

    return data.workoutPlans.filter(
      (plan) => Number(plan.userId) === Number(storedUser.userId)
    );
  }, [data.workoutPlans, storedUser?.userId]);

  const primaryPlan = useMemo(() => {
    return (
      visibleWorkoutPlans.find(
        (plan) =>
          String(plan.planId) === String(activeWorkout?.workoutPlanId)
      ) ||
      visibleWorkoutPlans.find(isGeneratedPlan) ||
      null
    );
  }, [activeWorkout?.workoutPlanId, visibleWorkoutPlans]);
  const assignedExercises = useMemo(() => getPlanExercises(primaryPlan), [primaryPlan]);
  const completedDayLabels = useMemo(() => {
    if (!primaryPlan) {
      return [];
    }

    return Array.from(
      new Set(
        finishedWorkouts
          .filter(
            (session) =>
              String(session.workoutPlanId) === String(primaryPlan.planId) &&
              session.status === "finished" &&
              session.selectedDayLabel
          )
          .map((session) => session.selectedDayLabel)
      )
    );
  }, [finishedWorkouts, primaryPlan]);
  const workoutDays = useMemo(() => {
    const groups = new Map();

    assignedExercises.forEach((exercise) => {
      const dayLabel = exercise.dayLabel || "Workout";
      const current = groups.get(dayLabel) || [];
      groups.set(dayLabel, [...current, exercise]);
    });

    return Array.from(groups.entries()).map(([dayLabel, exercises]) => ({
      dayLabel,
      exercises: exercises.slice().sort((left, right) => left.orderIndex - right.orderIndex)
    }));
  }, [assignedExercises]);
  const selectedDayExercises = useMemo(() => {
    return workoutDays.find((day) => day.dayLabel === selectedDayLabel)?.exercises || [];
  }, [selectedDayLabel, workoutDays]);
  const previewExercise = useMemo(() => {
    return (
      selectedDayExercises.find(
        (exercise) => String(exercise.exerciseId) === String(previewExerciseId)
      ) ||
      selectedDayExercises[0] ||
      null
    );
  }, [previewExerciseId, selectedDayExercises]);
  const isWorkoutActive = activeWorkout?.status === "active";
  const isWorkoutFinished = activeWorkout?.status === "finished";
  const activeDayLabel = isWorkoutActive
    ? String(activeWorkout?.selectedDayLabel || "").trim()
    : "";
  const activeDayExercises = useMemo(() => {
    return workoutDays.find((day) => day.dayLabel === activeDayLabel)?.exercises || [];
  }, [activeDayLabel, workoutDays]);
  const workoutPanelExercises = isWorkoutActive
    ? activeDayExercises
    : selectedDayExercises;
  const isPreviewingDifferentDay =
    isWorkoutActive &&
    selectedDayLabel !== "" &&
    selectedDayLabel !== activeDayLabel;

  useEffect(() => {
    if (
      workoutDays.length > 0 &&
      !workoutDays.some((day) => day.dayLabel === selectedDayLabel)
    ) {
      const firstDay = workoutDays[0];
      setSelectedDayLabel(firstDay.dayLabel);
      setSetForm((current) => ({
        ...current,
        exerciseId: firstDay.exercises[0]
          ? String(firstDay.exercises[0].exerciseId)
          : "",
        setNumber: "1"
      }));
    }
  }, [selectedDayLabel, workoutDays]);

  useEffect(() => {
    setPreviewExerciseId(
      selectedDayExercises[0] ? String(selectedDayExercises[0].exerciseId) : ""
    );
  }, [selectedDayExercises]);

  useEffect(() => {
    sessionDayExercisesRef.current = workoutPanelExercises;
  }, [workoutPanelExercises]);
  const currentExercise = useMemo(() => {
    return (
      workoutPanelExercises.find(
        (exercise) => String(exercise.exerciseId) === String(setForm.exerciseId)
      ) ||
      workoutPanelExercises[0] ||
      null
    );
  }, [setForm.exerciseId, workoutPanelExercises]);
  const totalPlannedSets = useMemo(() => {
    return workoutPanelExercises.reduce(
      (total, exercise) => total + Number(exercise.targetSets || 0),
      0
    );
  }, [workoutPanelExercises]);
  const sessionSetLogs = Array.isArray(activeWorkout?.SetLogs) ? activeWorkout.SetLogs : [];
  const currentExerciseIndex = workoutPanelExercises.findIndex(
    (exercise) => exercise.exerciseId === currentExercise?.exerciseId
  );
  const nextExercise =
    currentExerciseIndex >= 0 ? workoutPanelExercises[currentExerciseIndex + 1] || null : null;
  const completedSets =
    activeWorkout?.completedSets ??
    sessionSetLogs.filter((setLog) => setLog.completed !== false).length;
  const sessionTotalSets = Number(activeWorkout?.totalSets || totalPlannedSets);
  const progressPercent = sessionTotalSets
    ? Math.min(100, Math.round((completedSets / sessionTotalSets) * 100))
    : 0;
  const planContext = {
    goal: formatGoal(primaryPlan?.goal),
    aiCoachSpecialty:
      noteValue(primaryPlan?.notes, "AI coach specialty", "") ||
      noteValue(primaryPlan?.notes, "Coach specialty", "General fitness"),
    level: primaryPlan?.level || "Not set",
    daysPerWeek: primaryPlan?.daysPerWeek || "-",
    equipment: listText(noteValue(primaryPlan?.notes, "Equipment", "")),
    limitations: listText(noteValue(primaryPlan?.notes, "Limitations", "")),
    injuries: listText(noteValue(primaryPlan?.notes, "Injuries", "")),
    disliked: listText(noteValue(primaryPlan?.notes, "Disliked exercises", ""))
  };

  const canUseActiveWorkout = Boolean(
    primaryPlan && selectedDayLabel && selectedDayExercises.length > 0
  );

  function handleDaySelection(dayLabel) {
    const firstExercise = workoutDays.find((day) => day.dayLabel === dayLabel)?.exercises[0];
    setSelectedDayLabel(dayLabel);
    if (isWorkoutActive) {
      setLiveMessage(
        `${activeDayLabel} is still active. Finish it before starting ${dayLabel}.`
      );
      return;
    }
    setSetForm((current) => ({
      ...current,
      exerciseId: firstExercise ? String(firstExercise.exerciseId) : "",
      setNumber: "1"
    }));
  }

  function handleStartWorkout() {
    if (isWorkoutActive) {
      activePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setLiveMessage("Your active workout is ready to resume.");
      return;
    }
    if (!canUseActiveWorkout) {
      setLiveMessage("Choose a workout day before starting.");
      return;
    }

    const plan = primaryPlan;
    const exercise = selectedDayExercises[0];
    const userId = storedUser?.userId || plan.userId || 1;

    setSetForm((current) => ({
      ...current,
      exerciseId: String(exercise.exerciseId)
    }));
    setPendingAction("starting");
    socketRef.current?.emit("workout:started", {
      userId,
      workoutPlanId: plan.planId,
      selectedDayLabel
    });
  }

  function handleSetFormChange(event) {
    const { name, value } = event.target;
    setSetForm((current) => {
      if (name === "exerciseId") {
        const completedExerciseSets = sessionSetLogs.filter(
          (log) => String(log.exerciseId) === String(value)
        ).length;

        return {
          ...current,
          exerciseId: value,
          setNumber: String(completedExerciseSets + 1)
        };
      }

      return { ...current, [name]: value };
    });
  }

  function handleLogSet(event) {
    event.preventDefault();

    if (!activeWorkout?.workoutSessionId) {
      setLiveMessage("Start a workout before logging sets.");
      return;
    }

    setPendingAction("saving-set");
    socketRef.current?.emit("setLog:created", {
      workoutSessionId: activeWorkout.workoutSessionId,
      userId: activeWorkout.userId,
      workoutPlanId: activeWorkout.workoutPlanId,
      exerciseId: Number(setForm.exerciseId),
      setNumber: Number(setForm.setNumber),
      weight: Number(setForm.weight),
      reps: Number(setForm.reps)
    });
  }

  function handleReportIssue(event) {
    event.preventDefault();

    if (!activeWorkout?.workoutSessionId || issueText.trim() === "") {
      return;
    }

    socketRef.current?.emit("workout:issueReported", {
      workoutSessionId: activeWorkout.workoutSessionId,
      userId: activeWorkout.userId,
      workoutPlanId: activeWorkout.workoutPlanId,
      message: issueText.trim(),
      severity: "medium"
    });
    setPendingAction("reporting");
    setIssueText("");
  }

  function handleFinishWorkout() {
    if (!activeWorkout?.workoutSessionId) {
      return;
    }

    if (
      completedSets < sessionTotalSets &&
      !window.confirm(
        `Only ${completedSets} of ${sessionTotalSets} planned sets are complete. Finish this workout anyway?`
      )
    ) {
      return;
    }

    setPendingAction("finishing");
    socketRef.current?.emit("workout:finished", {
      workoutSessionId: activeWorkout.workoutSessionId
    });
  }

  async function handleRegeneratePlan() {
    if (!storedUser?.userId) {
      setLiveMessage("Sign in as a trainee before regenerating a plan.");
      return;
    }

    setPlanActionStatus("regenerating");
    setLiveMessage("");

    try {
      const refreshedPlan = await suggestWorkoutPlan(storedUser.userId);
      setData((current) => ({
        ...current,
        workoutPlans: current.workoutPlans.some((plan) => plan.planId === refreshedPlan.planId)
          ? current.workoutPlans.map((plan) =>
              plan.planId === refreshedPlan.planId ? refreshedPlan : plan
            )
          : [...current.workoutPlans, refreshedPlan]
      }));
      setLiveMessage("Generated workout plan refreshed from your latest fitness profile.");
    } catch (requestError) {
      setLiveMessage(requestError.message);
    } finally {
      setPlanActionStatus("idle");
    }
  }

  if (status === "loading") {
    return <LoadingState label="Loading generated training plan..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  return (
    <div className="training-dashboard">
      <section className="generated-plan-hero">
        <div>
          <p className="eyebrow">Generated plan</p>
          <h1>Your Generated Workout Plan</h1>
          <p>Built from your coach, goals, equipment, and limitations.</p>
        </div>
        <div className="training-cta-row">
          <button
            type="button"
            className="button button--primary"
            onClick={handleStartWorkout}
            disabled={!canUseActiveWorkout || pendingAction === "starting"}
          >
            {isWorkoutActive
              ? "Resume Active Workout"
              : pendingAction === "starting"
                ? "Starting..."
                : "Start Selected Day"}
          </button>
          <Link className="button button--ghost button--outline" to="/onboarding">
            Edit Fitness Profile
          </Link>
          <Link className="button button--ghost button--outline" to="/workout-history">
            Last Workouts
          </Link>
        </div>
      </section>

      <div className="training-dashboard__grid">
        <main className="training-main-column">
          <section className="why-plan-section" aria-labelledby="why-plan-heading">
            <div className="section-heading">
              <h2 id="why-plan-heading">Why this plan?</h2>
              <p>We built your plan based on your profile and goals.</p>
            </div>
            <div className="why-plan-grid">
              <article className="why-plan-card why-plan-card--green">
                <span>Goal</span>
                <strong>{planContext.goal}</strong>
              </article>
              <article className="why-plan-card why-plan-card--blue">
                <span>AI Coach Focus</span>
                <strong>{planContext.aiCoachSpecialty}</strong>
              </article>
              <article className="why-plan-card why-plan-card--purple">
                <span>Training Level</span>
                <strong>{planContext.level}</strong>
              </article>
              <article className="why-plan-card why-plan-card--orange">
                <span>Days per Week</span>
                <strong>{planContext.daysPerWeek} days</strong>
              </article>
              <article className="why-plan-card why-plan-card--blue">
                <span>Equipment</span>
                <strong>{planContext.equipment}</strong>
              </article>
              <article className="why-plan-card why-plan-card--shield">
                <span>Limitations / Injuries</span>
                <strong>
                  {planContext.limitations}
                  {planContext.injuries !== "None" ? `; ${planContext.injuries}` : ""}
                </strong>
              </article>
              <article className="why-plan-card why-plan-card--wide why-plan-card--red">
                <span>Disliked Exercises Avoided</span>
                <strong>{planContext.disliked}</strong>
              </article>
            </div>
          </section>

          <section className="weekly-plan-section weekly-plan-section--focused" aria-labelledby="weekly-plan-heading">
            <div className="section-heading section-heading--split">
              <div>
                <h2 id="weekly-plan-heading">Your Weekly Plan</h2>
                <p>Day-by-day exercise assignments generated from your latest fitness profile.</p>
              </div>
              <div className="plan-overview-pill">
                <span>{assignedExercises.length}</span>
                <strong>exercises</strong>
              </div>
            </div>

            {!primaryPlan ? (
              <EmptyState
                title="No generated workout plan found"
                message="Complete onboarding to build your coach-guided workout week."
              />
            ) : assignedExercises.length === 0 ? (
              <div className="empty-state generated-plan-empty">
                <h3>This generated plan needs exercise assignments</h3>
                <p>Refresh the plan from your latest onboarding answers to create day-by-day exercises.</p>
                <button
                  type="button"
                  className="button button--ghost button--outline"
                  onClick={handleRegeneratePlan}
                  disabled={planActionStatus === "regenerating" || !storedUser?.userId}
                >
                  {planActionStatus === "regenerating" ? "Repairing..." : "Repair Generated Plan"}
                </button>
              </div>
            ) : (
              <div className="workout-plan-grid workout-plan-grid--single">
                <WorkoutPlanCard
                  key={primaryPlan.planId || primaryPlan.id}
                  plan={primaryPlan}
                  completedDayLabels={completedDayLabels}
                  selectedDayLabel={selectedDayLabel}
                  onDaySelect={handleDaySelection}
                />
              </div>
            )}
          </section>


        </main>

        <aside className="training-side-column">
          <section
            className={`weekly-coach-review weekly-coach-review--${reviewTone(weeklyReview?.reviewDecision)}`}
            aria-labelledby="weekly-coach-review-heading"
          >
            <div className="weekly-coach-review__header">
              <div>
                <p className="eyebrow">Weekly coach review</p>
                <h2 id="weekly-coach-review-heading">
                  {weeklyReviewStatus === "error"
                    ? "Coach review unavailable"
                    : weeklyReview?.headline || "Your coach brief is loading"}
                </h2>
              </div>
              <span className="weekly-coach-review__status">
                {weeklyReviewStatus === "loading"
                  ? "Syncing"
                  : weeklyReviewStatus === "error"
                    ? "Retry"
                  : weeklyReview?.confidence
                    ? `${weeklyReview.confidence} confidence`
                    : "Preview"}
              </span>
            </div>

            {weeklyReviewStatus === "error" ? (
              <div className="weekly-coach-review__empty" role="status">
                <strong>Coach review unavailable</strong>
                <p>{weeklyReviewError || "Try again after your training data syncs."}</p>
              </div>
            ) : weeklyReview ? (
              <>
                <div className="weekly-coach-review__summary">
                  <div className="weekly-coach-review__metric">
                    <span>Review state</span>
                    <strong>{formatReviewLabel(weeklyReview.reviewDecision || "keep_plan")}</strong>
                  </div>
                  <div className="weekly-coach-review__metric">
                    <span>Plan changes</span>
                    <strong>Preview only</strong>
                  </div>
                </div>

                <div className="weekly-coach-review__decision">
                  <span>Next week focus</span>
                  <strong>{weeklyReview.recommendedNextStep}</strong>
                  {weeklyReviewActions.length === 0 && weeklyReview.coachNote ? (
                    <p className="weekly-coach-review__note">{weeklyReview.coachNote}</p>
                  ) : null}
                </div>

                <div className="weekly-coach-review__signals">
                  <span>Signals from your check-in</span>
                  {weeklyReviewSignals.length > 0 ? (
                    <div className="weekly-coach-review__signal-list" aria-label="Training signals">
                      {weeklyReviewSignals.map((signal) => (
                        <span className="weekly-coach-review__signal" key={signal}>
                          {publicSignalLabel(signal)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="weekly-coach-review__muted">
                      Add a note or chip so the coach can read load, pain, fatigue, equipment, or focus.
                    </p>
                  )}
                </div>

                {weeklyReviewActions.length > 0 ? (
                  <div className="weekly-coach-review__actions">
                    <span>Coach suggestions</span>
                    {weeklyReviewActions.map((action) => (
                      <article
                        className="weekly-coach-review__action"
                        key={`${action.type}-${action.label}-${action.reason}`}
                      >
                        <strong>{action.label}</strong>
                        <p>{action.reason}</p>
                        <small>{String(action.status || "preview_only").replace(/_/g, " ")}</small>
                      </article>
                    ))}
                    {weeklyReview.coachNote ? (
                      <p className="weekly-coach-review__note">{weeklyReview.coachNote}</p>
                    ) : null}
                  </div>
                ) : null}

                {Array.isArray(weeklyReview.keyFindings) && weeklyReview.keyFindings.length > 0 ? (
                  <div className="weekly-coach-review__block">
                    <span>What coach noticed</span>
                    <ul>
                      {weeklyReview.keyFindings.slice(0, 4).map((finding) => (
                        <li key={finding}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(weeklyReview.safetyNotes) && weeklyReview.safetyNotes.length > 0 ? (
                  <div className="weekly-coach-review__safety">
                    <span>Safety</span>
                    <ul>
                      {weeklyReview.safetyNotes.slice(0, 3).map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {weeklyReview ? (
                  <div className="weekly-coach-review__questions">
                    <span>Coach check-in for next week</span>
                    {weeklyCoachQuestions.length > 0 ? (
                      weeklyCoachQuestions.map((question, index) => (
                        <label className="weekly-coach-review__check-in" key={question}>
                          <p>{question}</p>
                          <textarea
                            aria-label={`Answer coach question ${index + 1}`}
                            maxLength={300}
                            rows={2}
                            value={weeklyCheckInAnswers[question] || ""}
                            onChange={(event) => updateWeeklyCheckInAnswer(question, event.target.value)}
                            placeholder="Short answer"
                          />
                        </label>
                      ))
                    ) : null}
                    <label className="weekly-coach-review__check-in">
                      <p>Anything the coach should know before next week?</p>
                      <textarea
                        aria-label="General coach note"
                        maxLength={500}
                        rows={3}
                        value={weeklyCheckInGeneralNote}
                        onChange={(event) => updateWeeklyCheckInGeneralNote(event.target.value)}
                        placeholder="Load, pain, fatigue, equipment, or what felt different"
                      />
                    </label>
                    <div className="weekly-coach-review__chips" aria-label="Quick check-in tags">
                      {WEEKLY_CHECK_IN_TAGS.map((tag) => {
                        const selected = weeklyCheckInSelectedTags.includes(tag.value);

                        return (
                          <button
                            key={tag.value}
                            type="button"
                            className={selected ? "weekly-coach-review__chip weekly-coach-review__chip--selected" : "weekly-coach-review__chip"}
                            aria-pressed={selected}
                            onClick={() => toggleWeeklyCheckInTag(tag.value)}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="button button--primary weekly-coach-review__check-in-submit"
                      onClick={submitWeeklyCheckIn}
                      disabled={
                        weeklyCheckInStatus === "loading" ||
                        weeklyReviewStatus === "loading" ||
                        !storedUser?.userId ||
                        !hasWeeklyCheckInInput
                      }
                    >
                      {weeklyCheckInStatus === "loading" ? "Sending..." : "Send check-in"}
                    </button>
                    {weeklyCheckInMessage ? (
                      <p className="weekly-coach-review__check-in-message" role="status">
                        {weeklyCheckInMessage}
                      </p>
                    ) : null}
                    {weeklyCheckInError ? (
                      <p className="weekly-coach-review__check-in-error" role="alert">
                        {weeklyCheckInError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="weekly-coach-review__empty" role="status">
                <strong>Building your weekly read</strong>
                <p>We are checking your recent sessions, sets, and reported issues.</p>
              </div>
            )}

            <button
              type="button"
              className="button button--ghost weekly-coach-review__refresh"
              onClick={refreshWeeklyReview}
              disabled={weeklyReviewStatus === "loading" || !storedUser?.userId}
            >
              {weeklyReviewStatus === "loading" ? "Refreshing..." : "Refresh review"}
            </button>
          </section>

          <section ref={activePanelRef} className="active-workout-sidebar" aria-labelledby="active-workout-heading">
            <div className="section-heading">
              <h2 id="active-workout-heading">Active Workout</h2>
              <p>
                {isWorkoutActive
                  ? `${activeDayLabel} is in progress. Log each set here for real-time coach updates.`
                  : selectedDayLabel
                    ? `Previewing ${selectedDayLabel}. Start it when you are ready to train.`
                    : "Choose a workout day to preview it here."}
              </p>
            </div>

            {isPreviewingDifferentDay ? (
              <div className="active-workout-day-notice" role="status" aria-live="polite">
                <strong>{activeDayLabel} is currently active.</strong>
                <span>
                  {selectedDayLabel} is selected in the weekly plan for preview only.
                  “Resume Active Workout” continues {activeDayLabel}.
                </span>
              </div>
            ) : null}

            {assignedExercises.length === 0 ? (
              <div className="current-exercise-card active-workout-empty">
                <span>Plan needed</span>
                <h3>No assigned exercises yet</h3>
                <p>Regenerate your plan before starting a workout.</p>
                <button
                  type="button"
                  className="button button--ghost button--outline"
                  onClick={handleRegeneratePlan}
                  disabled={planActionStatus === "regenerating" || !storedUser?.userId}
                >
                  {planActionStatus === "regenerating" ? "Repairing..." : "Repair Generated Plan"}
                </button>
              </div>
            ) : !isWorkoutActive ? (
              <div className="current-exercise-card active-workout-start-card">
                <span>{isWorkoutFinished ? "Workout Finished" : selectedDayLabel || "Selected Day"}</span>
                <ExercisePreview exercise={previewExercise} />
                <h3>
                  {isWorkoutFinished
                    ? `${activeWorkout.selectedDayLabel || "Workout"} complete`
                    : previewExercise?.name || "Select a workout day"}
                </h3>
                <p>
                  {isWorkoutFinished
                    ? `${activeWorkout.completedSets || sessionSetLogs.length} sets were saved.`
                    : previewExercise
                      ? previewExercise.subMuscleGroup ||
                        previewExercise.mainMuscleGroup ||
                        previewExercise.equipment ||
                        "Training target"
                      : "Select a workout day to preview its exercises."}
                </p>
                {!isWorkoutFinished && previewExercise ? (
                  <div className="selected-exercise-meta">
                    <span>{previewExercise.targetSets || "—"} sets</span>
                    <span>{previewExercise.targetReps || "—"} reps</span>
                    <span>{previewExercise.equipment || "Equipment not set"}</span>
                  </div>
                ) : null}
                {!isWorkoutFinished && selectedDayExercises.length > 0 ? (
                  <small>
                    {selectedDayExercises.length} exercises · {totalPlannedSets} planned sets
                  </small>
                ) : null}
                {!isWorkoutFinished && selectedDayExercises.length > 0 ? (
                  <div className="selected-day-preview-list">
                    {selectedDayExercises.map((exercise) => (
                      <button
                        key={exercise.exerciseId}
                        type="button"
                        className={
                          String(previewExercise?.exerciseId) === String(exercise.exerciseId)
                            ? "selected-day-preview-item selected-day-preview-item--active"
                            : "selected-day-preview-item"
                        }
                        onClick={() => setPreviewExerciseId(String(exercise.exerciseId))}
                      >
                        <strong>{exercise.name}</strong>
                        <span>
                          {exercise.targetSets || "—"} sets · {exercise.targetReps || "—"} reps
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {isWorkoutFinished ? (
                  <div className="finished-workout-summary">
                    {sessionSetLogs.map((log) => (
                      <span key={log.setLogId}>
                        {log.Exercise?.name || `Exercise #${log.exerciseId}`}: {log.weight} kg x{" "}
                        {log.reps}
                      </span>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleStartWorkout}
                  disabled={!canUseActiveWorkout || isWorkoutFinished}
                >
                  Start Selected Day
                </button>
                {isWorkoutFinished ? (
                  <Link className="button button--ghost button--outline" to="/workout-history">
                    View Last Workouts
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <div className="current-exercise-card">
                  <span>Current Exercise</span>
                  <ExercisePreview exercise={currentExercise} />
                  <h3>{currentExercise?.name || "No exercise selected"}</h3>
                  <p>{currentExercise?.subMuscleGroup || currentExercise?.mainMuscleGroup || "Training target"}</p>
                  <small>{nextExercise ? `Next: ${nextExercise.name}` : "Final exercise"}</small>
                </div>
                <div className="active-progress">
                  <div>
                    <span>
                      {completedSets} / {sessionTotalSets || workoutPanelExercises.length || 1} Sets Completed
                    </span>
                    <strong>{progressPercent}%</strong>
                  </div>
                  <div
                    className="session-progress-bar"
                    role="progressbar"
                    aria-label="Workout set progress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={progressPercent}
                  >
                    <span style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
                <ActiveExerciseSets
                  exercises={workoutPanelExercises}
                  setLogs={sessionSetLogs}
                />
                <form className="sidebar-set-form" onSubmit={handleLogSet}>
                  <label>
                    Exercise
                    <select name="exerciseId" value={setForm.exerciseId} onChange={handleSetFormChange}>
                      <option value="">Select exercise</option>
                      {workoutPanelExercises.map((exercise) => (
                        <option key={exercise.exerciseId} value={exercise.exerciseId}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="compact-form-grid">
                    <label>
                      Set
                      <input
                        name="setNumber"
                        type="number"
                        min="1"
                        value={setForm.setNumber}
                        onChange={handleSetFormChange}
                      />
                    </label>
                    <label>
                      Weight
                      <input
                        name="weight"
                        type="number"
                        min="0"
                        step="0.5"
                        value={setForm.weight}
                        onChange={handleSetFormChange}
                      />
                    </label>
                    <label>
                      Reps
                      <input
                        name="reps"
                        type="number"
                        min="1"
                        value={setForm.reps}
                        onChange={handleSetFormChange}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={
                      !activeWorkout ||
                      activeWorkout.status === "finished" ||
                      pendingAction === "saving-set"
                    }
                  >
                    {pendingAction === "saving-set" ? "Saving..." : "Save Set"}
                  </button>
                </form>
                <form className="sidebar-issue-form" onSubmit={handleReportIssue}>
                  <label>
                    Issue
                    <input
                      value={issueText}
                      onChange={(event) => setIssueText(event.target.value)}
                      placeholder="Pain, fatigue, equipment unavailable..."
                    />
                  </label>
                  <button
                    type="submit"
                    className="button button--ghost button--outline"
                    disabled={!activeWorkout || activeWorkout.status === "finished" || pendingAction === "reporting"}
                  >
                    Report an Issue
                  </button>
                </form>
              <button
                type="button"
                className="button button--ghost"
                onClick={handleFinishWorkout}
                disabled={!activeWorkout || activeWorkout.status === "finished" || pendingAction === "finishing"}
              >
                {pendingAction === "finishing" ? "Finishing..." : "Finish Workout"}
              </button>
              </>
            )}
          </section>

          <section className="week-overview-card">
            <h2>Week Overview</h2>
            <div className="week-dot-row" aria-label="Training days this week">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <span
                  key={day}
                  className={index < Number(primaryPlan?.daysPerWeek || 0) ? "week-dot week-dot--active" : "week-dot"}
                >
                  <small>{day}</small>
                  <b>{index + 1}</b>
                </span>
              ))}
            </div>
            <div className="week-metric-list">
              <article>
                <span>Workouts Planned</span>
                <strong>{primaryPlan?.daysPerWeek || 0}</strong>
              </article>
              <article>
                <span>Sets Completed</span>
                <strong>
                  {completedSets} / {sessionTotalSets || 0}
                </strong>
              </article>
              <article>
                <span>Assigned Exercises</span>
                <strong>{assignedExercises.length}</strong>
              </article>
            </div>
            <div className="keep-going-card">
              <strong>Keep it up</strong>
              <p>You are set up to follow the plan and send real-time progress to your coach.</p>
              <div
                className="session-progress-bar"
                role="progressbar"
                aria-label="Weekly workout progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progressPercent}
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </section>
        </aside>
      </div>

      {restoreError ? (
        <div className="message message--error" role="alert">
          Active workout restore is temporarily unavailable. Your plan is still available. {restoreError}
          <button className="button button--ghost" type="button" onClick={() => window.location.reload()}>
            Retry restore
          </button>
        </div>
      ) : null}
      {historyError ? (
        <div className="message message--error" role="alert">
          Workout history could not be loaded, but training remains available.
        </div>
      ) : null}
      {coachResponses.length > 0 ? (
        <section className="coach-response-panel" aria-label="Live coach responses">
          <strong>Coach Response</strong>
          {coachResponses.map((response) => (
            <article key={`${response.workoutSessionId}-${response.sentAt}`}>
              {response.senderRole === "ai_coach" ? (
                <small className="coach-response-from">
                  {response.specialistName ? `${response.specialistName} (AI)` : "AI Coach"}
                </small>
              ) : null}
              <p>{response.message}</p>
              <time>{new Date(response.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </article>
          ))}
        </section>
      ) : null}
      {liveMessage ? (
        <div className="message message--success" role="status" aria-live="polite">
          {liveMessage}
        </div>
      ) : null}
    </div>
  );
}

export default Training;
