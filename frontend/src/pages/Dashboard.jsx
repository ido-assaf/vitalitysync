import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Badge from "../components/Badge";
import DataCard from "../components/DataCard";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import {
  getActiveWorkoutSession,
  getNutritionToday,
  getStoredUser,
  getTraineeProfile,
  getWorkoutPlans,
  getWorkoutSessions
} from "../services/api";

const GENERATED_PLAN_PREFIX = "[ONBOARDING_SUGGESTED_PLAN]";

function localDateKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const dashboardIcons = {
  activity: <path d="M3 12h4l2.2-6 4 12 2.2-6H21" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 9h16" />
    </>
  ),
  chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  dumbbell: <path d="M6 8v8M3.5 10v4M18 8v8M20.5 10v4M6 12h12" />,
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />
      <path d="M4 4v4.5h4.5M12 8v4l3 2" />
    </>
  ),
  leaf: (
    <>
      <path d="M19 4C12 4 6 7.5 6 14c0 3 2 5 5 5 6.5 0 8-8 8-15Z" />
      <path d="M5 21c2-6 6-9 11-12" />
    </>
  ),
  play: <path d="m9 7 8 5-8 5Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3.1a8 8 0 0 0-1.8 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 3.1h4.8l.4-3.1a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2.1-1.5c.1-.3.1-.7.1-1Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" />
      <path d="m18.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  )
};

function DashboardIcon({ name }) {
  return (
    <svg
      className="dashboard-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dashboardIcons[name]}
    </svg>
  );
}

function getPlanExercises(plan) {
  if (Array.isArray(plan?.assignments)) {
    return plan.assignments
      .map((assignment) => ({
        ...(assignment.exercise || {}),
        exerciseId: assignment.exerciseId,
        dayLabel: assignment.dayLabel,
        orderIndex: assignment.orderIndex,
        targetSets: assignment.targetSets,
        targetReps: assignment.targetReps
      }))
      .filter((exercise) => exercise.name);
  }

  return Array.isArray(plan?.exercises) ? plan.exercises : [];
}

function groupExercisesByDay(exercises) {
  const groups = new Map();

  exercises.forEach((exercise) => {
    const dayLabel = exercise.dayLabel || "Workout";
    const current = groups.get(dayLabel) || [];
    groups.set(dayLabel, [...current, exercise]);
  });

  return Array.from(groups.entries()).map(([dayLabel, dayExercises]) => ({
    dayLabel,
    exercises: dayExercises
      .slice()
      .sort((left, right) => Number(left.orderIndex) - Number(right.orderIndex))
  }));
}

function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function isCurrentWeek(value) {
  if (!value) {
    return false;
  }

  return new Date(value) >= startOfCurrentWeek();
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })
    : "Recently";
}

function resolveActiveDayLabel(activeWorkout, workoutDays) {
  const savedLabel = String(activeWorkout?.selectedDayLabel || "").trim();

  if (savedLabel && workoutDays.some((day) => day.dayLabel === savedLabel)) {
    return savedLabel;
  }

  const loggedExerciseIds = new Set(
    (Array.isArray(activeWorkout?.SetLogs) ? activeWorkout.SetLogs : []).map((log) =>
      String(log.exerciseId)
    )
  );

  if (loggedExerciseIds.size === 0) {
    return "";
  }

  return (
    workoutDays.find((day) => {
      const dayExerciseIds = new Set(
        day.exercises.map((exercise) => String(exercise.exerciseId))
      );
      return Array.from(loggedExerciseIds).every((exerciseId) =>
        dayExerciseIds.has(exerciseId)
      );
    })?.dayLabel || ""
  );
}

function Dashboard() {
  const storedUser = getStoredUser();
  const [data, setData] = useState({
    profile: null,
    workoutPlans: [],
    activeWorkout: null,
    workoutHistory: [],
    nutritionToday: null,
    nutritionStatus: "loading"
  });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setStatus("loading");
      setError("");

      try {
        const [profile, workoutPlans, activeWorkout, workoutHistory, nutritionToday] =
          await Promise.all([
            getTraineeProfile(storedUser.userId),
            getWorkoutPlans(),
            getActiveWorkoutSession(storedUser.userId),
            getWorkoutSessions(storedUser.userId),
            getNutritionToday(localDateKey()).catch(() => null)
          ]);

        setData({
          profile,
          workoutPlans,
          activeWorkout,
          workoutHistory,
          nutritionToday,
          nutritionStatus: nutritionToday
            ? nutritionToday.configured
              ? "ready"
              : "not_configured"
            : "unavailable"
        });
        setStatus("success");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    if (storedUser?.userRole === "trainee" && storedUser?.userId) {
      loadDashboard();
    }
  }, [storedUser?.userId, storedUser?.userRole]);

  const currentPlan = useMemo(() => {
    const userPlans = data.workoutPlans.filter(
      (plan) => Number(plan.userId) === Number(storedUser?.userId)
    );
    const activePlan = userPlans.find(
      (plan) => Number(plan.planId) === Number(data.activeWorkout?.workoutPlanId)
    );

    return (
      activePlan ||
      userPlans
        .filter((plan) =>
          String(plan.notes || "").startsWith(GENERATED_PLAN_PREFIX)
        )
        .sort((left, right) => Number(right.planId) - Number(left.planId))[0] ||
      null
    );
  }, [data.activeWorkout?.workoutPlanId, data.workoutPlans, storedUser?.userId]);

  const workoutDays = useMemo(
    () => groupExercisesByDay(getPlanExercises(currentPlan)),
    [currentPlan]
  );
  const currentWeekHistory = useMemo(
    () =>
      data.workoutHistory.filter((session) =>
        isCurrentWeek(session.finishedAt || session.startedAt)
      ),
    [data.workoutHistory]
  );
  const completedDayLabels = useMemo(
    () =>
      new Set(
        currentWeekHistory
          .filter(
            (session) =>
              Number(session.workoutPlanId) === Number(currentPlan?.planId) &&
              session.selectedDayLabel
          )
          .map((session) => session.selectedDayLabel)
      ),
    [currentPlan?.planId, currentWeekHistory]
  );
  const activeDayLabel = resolveActiveDayLabel(data.activeWorkout, workoutDays);
  const nextIncompleteDay =
    workoutDays.find((day) => !completedDayLabels.has(day.dayLabel)) || null;
  const weekComplete =
    workoutDays.length > 0 && workoutDays.every((day) => completedDayLabels.has(day.dayLabel));
  const todayDay =
    workoutDays.find((day) => day.dayLabel === activeDayLabel) ||
    nextIncompleteDay ||
    workoutDays[0] ||
    null;
  const activeCompletedSets =
    data.activeWorkout?.completedSets ??
    (Array.isArray(data.activeWorkout?.SetLogs) ? data.activeWorkout.SetLogs.length : 0);
  const activeTotalSets =
    Number(data.activeWorkout?.totalSets) ||
    todayDay?.exercises.reduce(
      (total, exercise) => total + Number(exercise.targetSets || 0),
      0
    ) ||
    0;
  const activeProgress = activeTotalSets
    ? Math.min(100, Math.round((activeCompletedSets / activeTotalSets) * 100))
    : 0;
  const aiCoach = data.profile?.AiSpecialist || null;
  const recentSessions = data.workoutHistory.slice(0, 3);
  const nutritionToday = data.nutritionToday;
  const nutritionInsight =
    typeof nutritionToday?.insight === "string"
      ? { type: "neutral", text: nutritionToday.insight, action: "" }
      : nutritionToday?.insight || { type: "neutral", text: "", action: "" };

  async function retryNutrition() {
    setData((current) => ({ ...current, nutritionStatus: "loading" }));
    try {
      const nutrition = await getNutritionToday(localDateKey());
      setData((current) => ({
        ...current,
        nutritionToday: nutrition,
        nutritionStatus: nutrition.configured ? "ready" : "not_configured"
      }));
    } catch (requestError) {
      setData((current) => ({ ...current, nutritionStatus: "unavailable" }));
    }
  }

  if (storedUser?.userRole === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (status === "loading") {
    return <LoadingState label="Loading your daily training overview..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  return (
    <div className="daily-dashboard">
      <section className="daily-dashboard__welcome">
        <div className="daily-dashboard__welcome-copy">
          <p className="eyebrow">Today at VitalitySync</p>
          <h1>Welcome back, {storedUser?.firstName || "Trainee"}</h1>
          <p>Here&apos;s your training snapshot for today.</p>
          <div className="daily-dashboard__chips">
            <Badge tone="mint">
              {currentWeekHistory.length} workout
              {currentWeekHistory.length === 1 ? "" : "s"} this week
            </Badge>
            {data.activeWorkout ? <Badge tone="gold">Workout in progress</Badge> : null}
          </div>
        </div>
        <div className="dashboard-hero-art" aria-hidden="true">
          <span className="dashboard-hero-art__ring" />
          <span className="dashboard-hero-art__icon">
            <DashboardIcon name="dumbbell" />
          </span>
          <span className="dashboard-hero-art__pulse" />
        </div>
      </section>

      <section className="stats-grid stats-grid--three" aria-label="Weekly training overview">
        <div className="dashboard-stat dashboard-stat--completed">
          <span className="dashboard-stat__icon"><DashboardIcon name="check" /></span>
          <DataCard
            eyebrow="This week"
            title="Completed Workouts"
            value={currentWeekHistory.length}
            detail={`${completedDayLabels.size} plan day${completedDayLabels.size === 1 ? "" : "s"} completed`}
          />
        </div>
        <div className="dashboard-stat dashboard-stat--plan">
          <span className="dashboard-stat__icon"><DashboardIcon name="calendar" /></span>
          <DataCard
            eyebrow="Weekly plan"
            title="Workout Days"
            value={workoutDays.length}
            detail={weekComplete ? "All workout days complete" : "Personalized training schedule"}
          />
        </div>
        <div className="dashboard-stat dashboard-stat--sets">
          <span className="dashboard-stat__icon"><DashboardIcon name="activity" /></span>
          <DataCard
            eyebrow="Active progress"
            title="Sets Completed"
            value={data.activeWorkout ? activeCompletedSets : 0}
            detail={data.activeWorkout ? `${activeTotalSets} planned sets today` : "No active workout"}
          />
        </div>
      </section>

      <section className="daily-dashboard__primary-grid">
        <article className="today-workout-card">
          <div className="section-heading section-heading--split">
            <div className="dashboard-card-heading">
              <span className="dashboard-card-heading__icon">
                <DashboardIcon name="dumbbell" />
              </span>
              <div>
                <p className="eyebrow">Today&apos;s workout</p>
                <h2>
                  {todayDay?.dayLabel ||
                    (data.profile ? "Your plan is being prepared" : "Complete your profile")}
                </h2>
              </div>
            </div>
            {weekComplete && !data.activeWorkout ? (
              <Badge tone="mint">Week complete</Badge>
            ) : null}
          </div>

          {!currentPlan || !todayDay ? (
            <EmptyState
              title={data.profile ? "No workout plan yet" : "Fitness profile needed"}
              message={
                data.profile
                  ? "Open Training to generate or refresh your personalized plan."
                  : "Complete onboarding to generate your personalized workout week."
              }
            />
          ) : (
            <>
              <div className="today-exercise-list">
                {todayDay.exercises.slice(0, 4).map((exercise) => (
                  <div key={exercise.exerciseId} className="today-exercise-item">
                    <span>{exercise.orderIndex || "•"}</span>
                    <div>
                      <strong>{exercise.name}</strong>
                      <small>
                        {exercise.targetSets || "-"} sets · {exercise.targetReps || "-"} reps
                      </small>
                    </div>
                    <span className="today-exercise-item__status">
                      <DashboardIcon name="check" />
                    </span>
                  </div>
                ))}
              </div>
              {todayDay.exercises.length > 4 ? (
                <p className="dashboard-muted">
                  +{todayDay.exercises.length - 4} more exercises in Training
                </p>
              ) : null}
            </>
          )}

          {data.activeWorkout ? (
            <div className="dashboard-progress">
              <div>
                <span>
                  {activeCompletedSets} / {activeTotalSets} sets completed
                </span>
                <strong>{activeProgress}%</strong>
              </div>
              <div className="session-progress-bar" aria-hidden="true">
                <span style={{ width: `${activeProgress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="dashboard-action-row">
            <Link className="button button--primary dashboard-primary-action" to={data.profile ? "/training" : "/onboarding"}>
              <DashboardIcon name="play" />
              {data.activeWorkout
                ? "Resume Workout"
                : data.profile
                  ? "Start Workout"
                  : "Complete Profile"}
            </Link>
            {currentPlan ? (
              <Link className="button button--ghost button--outline" to="/training">
                View Plan
              </Link>
            ) : null}
          </div>
        </article>

        <article className="dashboard-nutrition-card">
          <div className="section-heading dashboard-card-heading">
            <span className="dashboard-card-heading__icon dashboard-card-heading__icon--warm">
              <DashboardIcon name="leaf" />
            </span>
            <div>
              <p className="eyebrow">Nutrition</p>
              <h2>
                {data.nutritionStatus === "ready"
                  ? "Nutrition today"
                  : data.nutritionStatus === "unavailable"
                    ? "Nutrition unavailable"
                    : "Set up NutriScan"}
              </h2>
            </div>
          </div>
          {data.nutritionStatus === "ready" && nutritionToday?.configured ? (
            <>
              <div className="dashboard-nutrition-summary">
                <div>
                  <span>Calories</span>
                  <strong>
                    {Math.round(nutritionToday.totals.calories)} /{" "}
                    {Math.round(nutritionToday.profile.dailyCaloriesTarget)}
                  </strong>
                  <div className="nutrition-progress-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          (nutritionToday.totals.calories /
                            nutritionToday.profile.dailyCaloriesTarget) *
                            100
                        )}%`
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span>Protein</span>
                  <strong>
                    {Math.round(nutritionToday.totals.protein)}g /{" "}
                    {Math.round(nutritionToday.profile.dailyProteinTarget)}g
                  </strong>
                  <div className="nutrition-progress-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          (nutritionToday.totals.protein /
                            nutritionToday.profile.dailyProteinTarget) *
                            100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="dashboard-muted dashboard-nutrition-insight">
                {nutritionInsight.text}
              </p>
              <div className={`dashboard-nutrition-remaining dashboard-nutrition-remaining--${nutritionInsight.type}`}>
                <span>
                  <strong>{Math.round(nutritionToday.remaining.calories)}</strong> kcal left
                </span>
                <span>
                  <strong>{Math.round(nutritionToday.remaining.protein)}g</strong> protein left
                </span>
              </div>
            </>
          ) : data.nutritionStatus === "unavailable" ? (
            <div className="dashboard-placeholder">
              <span className="dashboard-placeholder__badge">Temporarily unavailable</span>
              <strong>We could not load today&apos;s nutrition summary</strong>
              <p>Your food log is unchanged. Retry the summary or open Nutrition directly.</p>
              <button className="button button--ghost" type="button" onClick={retryNutrition}>
                Retry
              </button>
            </div>
          ) : (
            <div className="dashboard-placeholder">
              <span className="dashboard-placeholder__badge">Ready to start</span>
              <div className="dashboard-placeholder__visual" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>Turn food choices into a useful daily picture</strong>
              <p>Set your targets, search real products, and log what you eat.</p>
            </div>
          )}
          <Link className="button button--ghost" to="/nutrition">
            Open Nutrition
          </Link>
        </article>
      </section>

      <section className="daily-dashboard__secondary-grid">
        <article className="table-section">
          <div className="section-heading">
            <div className="dashboard-card-heading">
              <span className="dashboard-card-heading__icon">
                <DashboardIcon name="history" />
              </span>
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2>Your Latest Workouts</h2>
              </div>
            </div>
          </div>
          {recentSessions.length === 0 ? (
            <EmptyState
              title="No completed workouts yet"
              message="Your finished workouts and logged sets will appear here."
            />
          ) : (
            <div className="dashboard-activity-list">
              {recentSessions.map((session) => {
                const setLogs = Array.isArray(session.SetLogs) ? session.SetLogs : [];
                const latestSet = setLogs
                  .slice()
                  .sort(
                    (left, right) =>
                      new Date(right.logDate || right.createDate) -
                      new Date(left.logDate || left.createDate)
                  )[0];

                return (
                  <article key={session.workoutSessionId}>
                    <span className="dashboard-activity-list__indicator">
                      <DashboardIcon name="check" />
                    </span>
                    <div>
                      <strong>{session.selectedDayLabel || "Completed workout"}</strong>
                      <span>{formatDate(session.finishedAt || session.startedAt)}</span>
                    </div>
                    <p>
                      {session.completedSets || setLogs.length} completed sets
                      {latestSet
                        ? ` · Latest: ${latestSet.weight} kg × ${latestSet.reps} reps`
                        : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <Link className="dashboard-progress-link" to="/progress">
          <article className="current-plan-summary dashboard-progress-cta">
            <div className="dashboard-progress-cta__top">
              <span className="dashboard-progress-cta__icon">
                <DashboardIcon name="chart" />
              </span>
              <span className="dashboard-progress-cta__label">Training insights</span>
            </div>
            <div>
              <p className="eyebrow">Progress Analytics</p>
              <h2>See how your training is moving forward</h2>
              <p className="dashboard-muted">
                Track your strength, volume, reps, and improvements over time.
              </p>
            </div>
            <div className="dashboard-progress-cta__visual" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="button button--ghost dashboard-progress-cta__button">
              View Progress
            </span>
          </article>
        </Link>

        <div className="daily-dashboard__side-stack">
          <section className="dashboard-coach-stack" aria-labelledby="dashboard-coaches-heading">
            <div className="dashboard-coach-stack__heading">
              <div>
                <p className="eyebrow">AI specialists</p>
                <h2 id="dashboard-coaches-heading">AI Coaches</h2>
              </div>
              <span>Synced</span>
            </div>
            <article className="dashboard-coach-card dashboard-coach-card--fitness">
              <span className="dashboard-coach__avatar">
                <DashboardIcon name="dumbbell" />
              </span>
              <div>
                <h3>{aiCoach?.name || "Fitness Coach"}</h3>
                <small>Strength · Conditioning · Recovery</small>
                <p>
                  {aiCoach?.description ||
                    "Your plan uses your profile, equipment, goals, and limitations."}
                </p>
                <strong>
                  {Array.isArray(aiCoach?.rules) && aiCoach.rules[0]
                    ? aiCoach.rules[0]
                    : "Progress gradually and respect recovery."}
                </strong>
              </div>
            </article>
            <article className="dashboard-coach-card dashboard-coach-card--nutrition">
              <span className="dashboard-coach__avatar">
                <DashboardIcon name="leaf" />
              </span>
              <div>
                <h3>Nutritionist</h3>
                <small>Calories · Protein · Meal guidance</small>
                <p>
                  Targets and food guidance adapt from your fitness profile and nutrition logs.
                </p>
                <strong>Focus: fuel training and recovery.</strong>
              </div>
            </article>
            <article className="dashboard-coach-card dashboard-coach-card--sport">
              <span className="dashboard-coach__avatar">
                <DashboardIcon name="sparkles" />
              </span>
              <div>
                <h3>Sport Coach</h3>
                <small>Football · Basketball · Skill work</small>
                <p>
                  Sport-specific coaching will unlock after the core coaching engine is stronger.
                </p>
                <strong className="dashboard-coach-card__soon">Coming soon</strong>
              </div>
            </article>
          </section>

          <article className="dashboard-quick-actions">
            <p className="eyebrow">Quick actions</p>
            <div className="daily-quick-actions" aria-label="Quick actions">
              <Link className="quick-action" to="/training">
                <DashboardIcon name="play" />
                <span>{data.activeWorkout ? "Resume Workout" : "Start Workout"}</span>
              </Link>
              <Link className="quick-action" to="/workout-history">
                <DashboardIcon name="history" />
                <span>View History</span>
              </Link>
              <Link className="quick-action" to="/onboarding">
                <DashboardIcon name="user" />
                <span>Update Profile</span>
              </Link>
              <Link className="quick-action" to="/settings">
                <DashboardIcon name="settings" />
                <span>Settings</span>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
