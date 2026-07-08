import { useMemo, useState } from "react";

function formatPlanTitle(plan) {
  if (plan.title) {
    return plan.title;
  }

  if (plan.name) {
    return plan.name;
  }

  return `Plan #${plan.planId || plan.id}`;
}

function formatGoal(goal) {
  if (!goal) {
    return "Training goal";
  }

  return goal
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getTrainingDays(daysPerWeek) {
  if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
    return [];
  }

  return Array.from({ length: daysPerWeek }, (_, index) => `Day ${index + 1}`);
}

function getPlanExercises(plan) {
  if (Array.isArray(plan.assignments) && plan.assignments.length > 0) {
    return plan.assignments.map((assignment) => ({
      ...(assignment.exercise || {}),
      exerciseId: assignment.exerciseId,
      dayLabel: assignment.dayLabel,
      dayNumber: assignment.dayNumber,
      targetSets: assignment.targetSets,
      targetReps: assignment.targetReps,
      orderIndex: assignment.orderIndex,
      workoutPlanExerciseId: assignment.workoutPlanExerciseId
    })).filter((exercise) => exercise.name);
  }

  if (Array.isArray(plan.exercises)) {
    return plan.exercises;
  }

  if (Array.isArray(plan.Exercises)) {
    return plan.Exercises;
  }

  if (Array.isArray(plan.WorkoutPlanExercises)) {
    return plan.WorkoutPlanExercises.map((assignment) => ({
      ...(assignment.Exercise || {}),
      dayLabel: assignment.dayLabel,
      targetSets: assignment.targetSets,
      targetReps: assignment.targetReps,
      orderIndex: assignment.orderIndex
    })).filter((exercise) => exercise.name);
  }

  return [];
}

function groupExercisesByDay(exercises) {
  return exercises.reduce((groups, exercise) => {
    const day = exercise.dayLabel || "Plan exercises";
    const current = groups.get(day) || [];
    groups.set(day, [...current, exercise]);
    return groups;
  }, new Map());
}

function exerciseRationale(exercise) {
  const target = exercise.subMuscleGroup || exercise.mainMuscleGroup || exercise.muscleGroup;
  const equipment = exercise.equipment;

  if (target && equipment) {
    return `Chosen to target ${target} using ${equipment}.`;
  }

  if (target) {
    return `Chosen to support ${target} development.`;
  }

  return "Included to support your weekly training structure.";
}

function ExerciseThumb({ exercise }) {
  if (exercise.imageUrl) {
    return (
      <img
        className="exercise-thumb"
        src={exercise.imageUrl}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className="exercise-thumb exercise-thumb--fallback" aria-hidden="true">
      {String(exercise.name || "VS").slice(0, 2).toUpperCase()}
    </div>
  );
}

function WorkoutPlanCard({
  plan,
  completedDayLabels = [],
  selectedDayLabel = "",
  onDaySelect
}) {
  const trainingDays = getTrainingDays(plan.daysPerWeek);
  const exercises = getPlanExercises(plan);
  const completedDays = new Set(completedDayLabels);
  const exerciseGroups = useMemo(
    () => Array.from(groupExercisesByDay(exercises).entries()),
    [exercises]
  );
  const [internalSelectedDay, setInternalSelectedDay] = useState(
    exerciseGroups[0]?.[0] || ""
  );
  const selectedDay = onDaySelect ? selectedDayLabel : internalSelectedDay;
  const activeDay = exerciseGroups.some(([day]) => day === selectedDay)
    ? selectedDay
    : exerciseGroups[0]?.[0] || "";
  const activeExercises = exerciseGroups.find(([day]) => day === activeDay)?.[1] || [];

  function handleDaySelect(day) {
    setInternalSelectedDay(day);
    onDaySelect?.(day);
  }

  return (
    <article className="workout-plan-card">
      <div className="workout-plan-card__header">
        <div>
          <p className="eyebrow">Plan</p>
          <h3>{formatPlanTitle(plan)}</h3>
        </div>
        {plan.userId ? <span className="workout-plan-card__user">User #{plan.userId}</span> : null}
      </div>

      <div className="workout-plan-card__metrics" aria-label={`${formatPlanTitle(plan)} details`}>
        <div>
          <span>Goal</span>
          <strong>{formatGoal(plan.goal)}</strong>
        </div>
        <div>
          <span>Level</span>
          <strong>{plan.level || "Not set"}</strong>
        </div>
        <div>
          <span>Weekly days</span>
          <strong>{plan.daysPerWeek || "-"}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{plan.durationMinutes ? `${plan.durationMinutes} min` : "-"}</strong>
        </div>
      </div>

      <div className="workout-plan-card__block">
        <span>Your weekly plan</span>
        {exercises.length > 0 ? (
          <>
            <div className="plan-day-tabs" aria-label="Training days">
              {(exerciseGroups.length > 0 ? exerciseGroups.map(([day]) => day) : trainingDays).map(
                (day) => {
                  const isCompleted = completedDays.has(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      className={`plan-day-tab ${
                        day === activeDay ? "plan-day-tab--active" : ""
                      } ${isCompleted ? "plan-day-tab--complete" : ""}`}
                      onClick={() => handleDaySelect(day)}
                      aria-pressed={day === activeDay}
                      aria-current={day === activeDay ? "true" : undefined}
                    >
                      <strong>{day}</strong>
                      <span>{isCompleted ? "✓ Done" : day === activeDay ? "Selected" : "Workout"}</span>
                    </button>
                  );
                }
              )}
            </div>
            <div className="plan-day-list">
              <section className="plan-day">
                <div className="plan-day__header">
                  <strong>{activeDay}</strong>
                  <span>{activeExercises.length} exercises</span>
                </div>
                <div className="exercise-assignment-list">
                  {activeExercises.map((exercise) => (
                    <article
                      key={`${activeDay}-${exercise.exerciseId || exercise.name}`}
                      className="exercise-assignment"
                    >
                      <ExerciseThumb exercise={exercise} />
                      <div className="exercise-assignment__body">
                        <div className="exercise-assignment__top">
                          <div>
                            <strong>
                              <span className="exercise-order-badge">
                                {exercise.orderIndex || activeExercises.indexOf(exercise) + 1}
                              </span>
                              {exercise.name || "Assigned exercise"}
                            </strong>
                            <div className="chip-row chip-row--compact">
                              {exercise.mainMuscleGroup ? (
                                <span className="chip chip--solid">{exercise.mainMuscleGroup}</span>
                              ) : null}
                              {exercise.subMuscleGroup ? (
                                <span className="chip">{exercise.subMuscleGroup}</span>
                              ) : null}
                            </div>
                          </div>
                          {exercise.targetSets ? (
                            <span className="set-pill">
                              {exercise.targetSets} sets
                              <small>{exercise.targetReps || "-"} reps</small>
                            </span>
                          ) : null}
                        </div>
                        <div className="exercise-meta-line">
                          <span>{exercise.equipment || "Equipment not set"}</span>
                          {exercise.level ? <span>{exercise.level}</span> : null}
                        </div>
                        <p className="exercise-rationale">
                          {exercise.rationale || exerciseRationale(exercise)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          <p>This generated plan does not have assigned exercises yet.</p>
        )}
      </div>


    </article>
  );
}

export default WorkoutPlanCard;
