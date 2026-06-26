import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { getStoredUser, getWorkoutPlans, getWorkoutSessions } from "../services/api";
import { calculateProgressAnalytics, startOfWeek } from "../utils/progressAnalytics";

const DAY_MS = 24 * 60 * 60 * 1000;

function number(value, digits = 0) {
  return new Intl.NumberFormat([], { maximumFractionDigits: digits }).format(value || 0);
}

function weekLabel(date) {
  const start = startOfWeek(date);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function setLabel(set) {
  return `${number(set.weight, 1)} kg × ${set.reps}`;
}

function InfoTooltip({ label, children }) {
  return (
    <span className="progress-info">
      <button type="button" aria-label={label}>i</button>
      <span className="progress-info__content" role="tooltip">{children}</span>
    </span>
  );
}

function planDayLabels(plan) {
  const assignments = Array.isArray(plan?.assignments)
    ? plan.assignments
    : Array.isArray(plan?.WorkoutPlanExercises)
      ? plan.WorkoutPlanExercises
      : [];
  return Array.from(
    new Set(assignments.map((assignment) => assignment.dayLabel).filter(Boolean))
  );
}

function Progress() {
  const user = getStoredUser();
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(() => startOfWeek(new Date()));
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  useEffect(() => {
    if (user?.userRole !== "trainee" || !user?.userId) return;
    Promise.allSettled([getWorkoutSessions(user.userId), getWorkoutPlans()])
      .then(([sessionResult, planResult]) => {
        if (sessionResult.status === "rejected") {
          throw sessionResult.reason;
        }
        setSessions(sessionResult.value);
        setPlans(planResult.status === "fulfilled" ? planResult.value : []);
        setStatus("ready");
      })
      .catch((requestError) => {
        setError(requestError.message);
        setStatus("error");
      });
  }, [user?.userId, user?.userRole]);

  const analytics = useMemo(
    () => calculateProgressAnalytics(sessions, selectedWeek),
    [sessions, selectedWeek]
  );
  const selectedExercise =
    analytics.exerciseSeries.find(
      (exercise) => String(exercise.exerciseId || exercise.exerciseName) === selectedExerciseId
    ) || analytics.exerciseSeries[0] || null;
  const maxDailyVolume = Math.max(...analytics.dailyVolume.map((day) => day.volume), 0);
  const maxExerciseWeight = Math.max(
    ...(selectedExercise?.recentSessions.map((session) => session.best.weight) || []),
    0
  );
  const workoutExplanation = useMemo(() => {
    const completedLabels = Array.from(
      new Set(analytics.weekSessions.map((session) => session.selectedDayLabel).filter(Boolean))
    );
    const planIds = Array.from(
      new Set(
        analytics.weekSessions
          .map((session) => session.workoutPlanId)
          .filter((planId) => planId !== null && planId !== undefined)
          .map(String)
      )
    );
    const mappedPlan =
      planIds.length === 1
        ? plans.find((plan) => String(plan.planId) === planIds[0])
        : null;
    const plannedLabels = planDayLabels(mappedPlan);
    const canMapExactly =
      Boolean(mappedPlan) &&
      plannedLabels.length > 0 &&
      completedLabels.every((label) => plannedLabels.includes(label));

    return {
      completedLabels,
      remainingLabels: canMapExactly
        ? plannedLabels.filter((label) => !completedLabels.includes(label))
        : [],
      canMapExactly
    };
  }, [analytics.weekSessions, plans]);
  const bestImprovement = analytics.bestImprovement;
  const bestImprovementValue = bestImprovement
    ? bestImprovement.label === "More reps"
      ? `${bestImprovement.exerciseName} +${bestImprovement.repsChange} reps`
      : `${bestImprovement.exerciseName} +${number(bestImprovement.weightChange, 1)} kg`
    : "Not enough history yet";

  if (user?.userRole === "admin") return <Navigate to="/admin" replace />;
  if (status === "loading") return <LoadingState label="Calculating your training progress..." />;
  if (status === "error") return <ErrorState message={error} />;

  return (
    <div className="progress-page progress-page--analytics">
      <header className="progress-analytics-header">
        <div>
          <p className="eyebrow">Training intelligence</p>
          <h1>Progress Analytics</h1>
          <p>Strength, volume, consistency, and improvements from your completed workouts.</p>
        </div>
        <div className="progress-week-controls">
          <button type="button" onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * DAY_MS))}>Previous</button>
          <strong>{weekLabel(selectedWeek)}</strong>
          <button
            type="button"
            onClick={() => setSelectedWeek(startOfWeek(new Date()))}
            disabled={startOfWeek(selectedWeek).getTime() === startOfWeek(new Date()).getTime()}
          >
            This Week
          </button>
        </div>
      </header>

      {analytics.logCount === 0 ? (
        <EmptyState title="No progress data yet" message="Finish a workout and log your sets to unlock real analytics." />
      ) : (
        <>
          <section className="progress-kpi-grid">
            <article className="progress-kpi progress-kpi--volume">
              <span className="progress-kpi__icon">V</span>
              <div>
                <small className="progress-label-with-info">
                  Weekly Volume
                  <InfoTooltip label="How Weekly Volume is calculated">
                    <strong>Completed weighted sets only</strong>
                    <span>Formula: weight × reps</span>
                    <span>Example: 30 kg × 10 reps = 300 kg volume.</span>
                    <span>Bodyweight or 0 kg sets count as activity, but not weighted volume.</span>
                  </InfoTooltip>
                </small>
                <strong>{number(analytics.currentWeekVolume)} kg</strong>
              </div>
              <p>{analytics.volumeChangePercent === null ? "No prior-week comparison" : `${analytics.volumeChangePercent >= 0 ? "Up" : "Down"} ${number(Math.abs(analytics.volumeChangePercent), 1)}% vs previous week`}</p>
            </article>

            <article className="progress-kpi">
              <span className="progress-kpi__icon">✓</span>
              <div>
                <small className="progress-label-with-info">
                  Workouts Completed
                  <InfoTooltip label="How completed workouts are counted">
                    {workoutExplanation.canMapExactly ? (
                      <>
                        <strong>Completed this week</strong>
                        <span>{workoutExplanation.completedLabels.length ? workoutExplanation.completedLabels.map((label) => `✓ ${label}`).join("\n") : "No plan days completed."}</span>
                        <strong>Remaining</strong>
                        <span>{workoutExplanation.remainingLabels.length ? workoutExplanation.remainingLabels.map((label) => `○ ${label}`).join("\n") : "No remaining plan days."}</span>
                      </>
                    ) : (
                      <span>This counts finished workout sessions in the selected week. Exact remaining plan days are shown only when sessions map reliably to one plan.</span>
                    )}
                  </InfoTooltip>
                </small>
                <strong>{analytics.weekSessionCount}</strong>
              </div>
              <p>{analytics.activeDays} active day{analytics.activeDays === 1 ? "" : "s"} this week</p>
            </article>

            <article className="progress-kpi">
              <span className="progress-kpi__icon">↑</span>
              <div>
                <small className="progress-label-with-info">
                  Best Improvement
                  <InfoTooltip label="How Best Improvement is calculated">
                    <span>Best Improvement compares your latest performance for the same exercise against a previous session. It does not compare different exercises.</span>
                  </InfoTooltip>
                </small>
                <strong>{bestImprovementValue}</strong>
              </div>
              <p>
                {bestImprovement
                  ? `${setLabel(bestImprovement.previous)} → ${setLabel(bestImprovement.latest)}`
                  : "Complete the same exercise twice to see improvements."}
              </p>
            </article>

            <article className="progress-kpi">
              <span className="progress-kpi__icon">●</span>
              <div><small>Recent Activity</small><strong>{analytics.activeDays} / 7 days</strong></div>
              <div className="progress-activity-days">
                {analytics.dailyVolume.map((day) => <span key={day.label} className={day.active ? "active" : ""}>{day.label[0]}</span>)}
              </div>
            </article>
          </section>

          {analytics.weekSessionCount === 0 ? (
            <EmptyState title="No workouts in this week" message="Use Previous to inspect a week with completed sessions." />
          ) : null}

          <section className="progress-chart-grid">
            <article className="progress-panel">
              <div className="section-heading">
                <p className="eyebrow">Weekly volume trend</p>
                <h2 className="progress-label-with-info">
                  Volume by day
                  <InfoTooltip label="How the Weekly Volume Trend is calculated">
                    <span>This chart shows daily training volume from completed weighted sets. Volume = weight × reps.</span>
                  </InfoTooltip>
                </h2>
                <p>Sum of weight × reps from completed weighted sets.</p>
              </div>
              {maxDailyVolume > 0 ? (
                <div className="progress-line-bars">
                  {analytics.dailyVolume.map((day) => (
                    <div
                      key={day.label}
                      title={`${day.date.toLocaleDateString([], { weekday: "long" })}\nVolume: ${number(day.volume)} kg\nCompleted sets: ${day.completedSetCount}\nWorkouts: ${day.workoutLabels.length ? day.workoutLabels.join(", ") : "None"}`}
                    >
                      <span>{day.volume ? number(day.volume) : "0"}</span>
                      <i><b style={{ height: `${day.volume ? Math.max(8, day.volume / maxDailyVolume * 100) : 0}%` }} /></i>
                      <strong>{day.label}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No weighted sets this week" message="Bodyweight sets count as activity but cannot produce weight × reps volume without a logged load." />
              )}
            </article>

            <article className="progress-panel">
              <div className="section-heading section-heading--split">
                <div><p className="eyebrow">Strength progress</p><h2>By exercise</h2></div>
                <select value={selectedExerciseId || String(selectedExercise?.exerciseId || selectedExercise?.exerciseName || "")} onChange={(event) => setSelectedExerciseId(event.target.value)}>
                  {analytics.exerciseSeries.map((exercise) => <option key={exercise.exerciseId || exercise.exerciseName} value={exercise.exerciseId || exercise.exerciseName}>{exercise.exerciseName}</option>)}
                </select>
              </div>
              {selectedExercise ? (
                <div className="progress-strength-bars">
                  {selectedExercise.recentSessions.map((session, index) => (
                    <div key={`${session.date}-${index}`}>
                      <span>{setLabel(session.best)}</span>
                      <i style={{ height: `${Math.max(18, session.best.weight / maxExerciseWeight * 100)}%` }} />
                      <small>{session.date.toLocaleDateString([], { month: "short", day: "numeric" })}</small>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No weighted exercise history" message="Log weighted sets to build an exercise trend." />}
            </article>
          </section>

          <section className="progress-detail-grid progress-detail-grid--analytics">
            <article className="progress-panel">
              <div className="section-heading"><p className="eyebrow">Exercise improvements</p><h2>Previous vs latest</h2></div>
              {analytics.exerciseChanges.length ? (
                <div className="progress-improvement-table">
                  {analytics.exerciseChanges.slice(0, 6).map((change) => (
                    <div key={change.exerciseId || change.exerciseName}>
                      <strong>{change.exerciseName}</strong>
                      <span>{setLabel(change.previous)} → {setLabel(change.latest)}</span>
                      <b className={`progress-change progress-change--${change.tone}`}>{change.label}</b>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="More exercise history needed" message="Repeat an exercise in at least two finished workouts to compare performance." />}
            </article>

            <article className="progress-panel">
              <div className="section-heading"><p className="eyebrow">Recent achievements</p><h2>Real progress signals</h2></div>
              {analytics.achievements.length ? (
                <div className="progress-achievement-list">{analytics.achievements.map((achievement) => <p key={achievement}><span>✓</span>{achievement}</p>)}</div>
              ) : <EmptyState title="Building your baseline" message="Achievements appear when volume, load, reps, or activity clearly improves." />}
            </article>
          </section>

          <section className="progress-coach-card">
            <span className="progress-kpi__icon">✦</span>
            <div><p className="eyebrow">Coach insight</p><h2>Training recommendation</h2><p>{analytics.coachInsight}</p></div>
            {analytics.bodyweightSetCount > 0 ? <small>{analytics.bodyweightSetCount} bodyweight set{analytics.bodyweightSetCount === 1 ? "" : "s"} counted as activity, not weighted volume.</small> : null}
          </section>
        </>
      )}
    </div>
  );
}

export default Progress;
