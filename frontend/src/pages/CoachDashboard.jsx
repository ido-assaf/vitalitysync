import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import WorkoutHistoryList from "../components/WorkoutHistoryList";
import {
  getCoachTrainees,
  getCoachWorkoutHistory,
  getLiveCoachSessions,
  getStoredUser
} from "../services/api";
import { createWorkoutSocket } from "../services/socket";

function getSessionTitle(session) {
  const user = session.User;
  const plan = session.WorkoutPlan;

  if (user && plan) {
    return `${user.firstName} ${user.lastName} - ${plan.goal}`;
  }

  return `Workout session #${session.workoutSessionId}`;
}

function formatList(items, fallback = "Not set") {
  return Array.isArray(items) && items.length > 0 ? items.join(", ") : fallback;
}

function statusTone(status) {
  return status === "finished" ? "gold" : "mint";
}

function CoachDashboard() {
  const [sessions, setSessions] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const storedUser = getStoredUser();

  useEffect(() => {
    async function loadLiveSessions() {
      setStatus("loading");
      setError("");

      try {
        const [liveSessions, traineeData, completedSessions] = await Promise.all([
          getLiveCoachSessions(),
          getCoachTrainees(),
          getCoachWorkoutHistory()
        ]);
        setSessions(liveSessions);
        setTrainees(traineeData);
        setWorkoutHistory(completedSessions);
        setStatus("success");
      } catch (requestError) {
        setError(requestError.message);
        setStatus("error");
      }
    }

    loadLiveSessions();
  }, []);

  useEffect(() => {
    const socket = createWorkoutSocket(storedUser?.userRole === "admin" ? "admin" : "coach");

    function addEvent(type, payload) {
      setEvents((current) =>
        [
          {
            id: `${type}-${Date.now()}`,
            type,
            payload,
            receivedAt: new Date().toISOString()
          },
          ...current
        ].slice(0, 20)
      );
    }

    function upsertSession(session) {
      setSessions((current) => {
        const existingIndex = current.findIndex(
          (item) => item.workoutSessionId === session.workoutSessionId
        );

        if (existingIndex === -1) {
          return [session, ...current];
        }

        return current.map((item) =>
          item.workoutSessionId === session.workoutSessionId ? { ...item, ...session } : item
        );
      });
    }

    socket.on("workout:started", (session) => {
      upsertSession(session);
      addEvent("workout:started", session);
    });

    socket.on("setLog:created", (setLog) => {
      addEvent("setLog:created", setLog);
    });

    socket.on("workout:progressUpdated", (progress) => {
      setSessions((current) =>
        current.map((session) =>
          session.workoutSessionId === progress.workoutSessionId
            ? { ...session, ...progress }
            : session
        )
      );
      addEvent("workout:progressUpdated", progress);
    });

    socket.on("workout:issueReported", (issue) => {
      addEvent("workout:issueReported", issue);
    });

    socket.on("workout:finished", (session) => {
      upsertSession(session);
      setWorkoutHistory((current) => [
        session,
        ...current.filter((item) => item.workoutSessionId !== session.workoutSessionId)
      ]);
      addEvent("workout:finished", session);
    });

    return () => {
      socket.disconnect();
    };
  }, [storedUser?.userRole]);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status !== "finished"),
    [sessions]
  );

  if (status === "loading") {
    return <LoadingState label="Loading live coach dashboard..." />;
  }

  if (status === "error") {
    return <ErrorState message={error} />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Coach/Admin"
        title="Live Coach Dashboard"
        description={
          storedUser?.userRole === "admin"
            ? "Monitor all trainee workout starts, set logs, progress updates, issue reports, and finished sessions."
            : "Monitor assigned trainees, workout starts, set logs, progress updates, issue reports, and finished sessions."
        }
      />

      <section className="stats-grid stats-grid--three" aria-label="Coach trainee overview">
        <article className="data-card">
          <p className="data-card__eyebrow">Assigned Trainees</p>
          <div className="data-card__body">
            <h3>{storedUser?.userRole === "admin" ? "All trainees" : "My trainees"}</h3>
            <strong>{trainees.length}</strong>
          </div>
          <p className="data-card__detail">Filtered by coach assignment</p>
        </article>
        <article className="data-card">
          <p className="data-card__eyebrow">Active Sessions</p>
          <div className="data-card__body">
            <h3>Live workouts</h3>
            <strong>{activeSessions.length}</strong>
          </div>
          <p className="data-card__detail">Currently visible to this dashboard</p>
        </article>
        <article className="data-card">
          <p className="data-card__eyebrow">Event Stream</p>
          <div className="data-card__body">
            <h3>Recent events</h3>
            <strong>{events.length}</strong>
          </div>
          <p className="data-card__detail">Live Socket.IO updates</p>
        </article>
      </section>

      <section className="table-section">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Trainee Profiles</p>
            <h2>{storedUser?.userRole === "admin" ? "All Trainees" : "Assigned Trainees"}</h2>
          </div>
          <Badge tone="mint">{trainees.length} total</Badge>
        </div>

        {trainees.length === 0 ? (
          <EmptyState title="No trainees found" message="No trainee profiles are assigned yet." />
        ) : (
          <div className="coach-grid">
            {trainees.map((trainee) => {
              const profile = trainee.TraineeProfile;
              const generatedPlan = Array.isArray(trainee.WorkoutPlans)
                ? trainee.WorkoutPlans.find((plan) =>
                    String(plan.notes || "").startsWith("[ONBOARDING_SUGGESTED_PLAN]")
                  )
                : null;
              const generatedExercises = Array.isArray(generatedPlan?.exercises)
                ? generatedPlan.exercises
                : Array.isArray(generatedPlan?.WorkoutPlanExercises)
                  ? generatedPlan.WorkoutPlanExercises.map((assignment) => ({
                      ...assignment.Exercise,
                      dayLabel: assignment.dayLabel
                    })).filter((exercise) => exercise.name)
                  : [];

              return (
                <article key={trainee.userId} className="trainee-monitor-card">
                  <div className="trainee-monitor-card__top">
                    <div>
                      <span>Trainee #{trainee.userId}</span>
                      <strong>
                        {trainee.firstName} {trainee.lastName}
                      </strong>
                    </div>
                    <Badge tone={profile ? "mint" : "gold"}>{profile ? "profile ready" : "missing"}</Badge>
                  </div>
                  {profile ? (
                    <>
                      <div className="trainee-profile-grid">
                        <span>
                          <strong>{profile.goal}</strong>
                          Goal
                        </span>
                        <span>
                          <strong>{profile.level}</strong>
                          Level
                        </span>
                        <span>
                          <strong>{profile.trainingDaysPerWeek}</strong>
                          Days/week
                        </span>
                      </div>
                      <div className="monitor-detail-list">
                        <p><strong>Equipment:</strong> {formatList(profile.equipmentAccess)}</p>
                        <p><strong>Limitations:</strong> {formatList(profile.limitations, "None")}</p>
                        <p><strong>Injuries:</strong> {formatList(profile.injuries, "None")}</p>
                        <p><strong>Plan:</strong> {generatedPlan ? generatedPlan.goal : "No suggested plan yet"}</p>
                      </div>
                      {generatedExercises.length > 0 ? (
                        <div className="plan-preview-list">
                          {generatedExercises.slice(0, 6).map((exercise) => (
                            <span key={`${trainee.userId}-${exercise.dayLabel}-${exercise.name}`}>
                              {exercise.dayLabel}: {exercise.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p>This trainee has not completed onboarding yet.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="coach-grid" aria-label="Live monitored sessions">
        {activeSessions.length === 0 ? (
          <EmptyState
            title="No active workouts"
            message="Start a workout from the Training page to see it appear here."
          />
        ) : (
          activeSessions.map((session) => (
            <article key={session.workoutSessionId} className="coach-session-card">
              <div className="evaluation-card__top">
                <Badge tone={statusTone(session.status)}>{session.status}</Badge>
                <strong>#{session.workoutSessionId}</strong>
              </div>
              <h3>{getSessionTitle(session)}</h3>
              <p>
                {session.completedSets || 0} completed sets, {session.issueCount || 0} issues
                reported
              </p>
              <div className="session-progress-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${
                      session.totalSets
                        ? Math.min(100, ((session.completedSets || 0) / session.totalSets) * 100)
                        : session.status === "active"
                          ? 18
                          : 100
                    }%`
                  }}
                />
              </div>
            </article>
          ))
        )}
      </section>

      <section className="table-section">
        <div className="section-heading">
          <p className="eyebrow">Completed training</p>
          <h2>Recent Workout Details</h2>
          <p>Persisted sessions for trainees assigned to this coach.</p>
        </div>
        <WorkoutHistoryList sessions={workoutHistory} showUser />
      </section>

      <section className="table-section">
        <div className="section-heading">
          <p className="eyebrow">Real-time event stream</p>
          <h2>Coach Monitoring Events</h2>
        </div>
        {events.length === 0 ? (
          <EmptyState title="No live events yet" message="Incoming workout events appear here." />
        ) : (
          <div className="event-feed">
            {events.map((event) => (
              <article key={event.id} className="event-feed__item">
                <strong>{event.type}</strong>
                <span>{new Date(event.receivedAt).toLocaleTimeString()}</span>
                <p>
                  Session #{event.payload.workoutSessionId || "-"} User #
                  {event.payload.userId || "-"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CoachDashboard;
