import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import WorkoutHistoryList from "../components/WorkoutHistoryList";
import {
  assignAiCoach,
  createAdminAiCoach,
  deleteAdminAiCoach,
  getAdminAiCoaches,
  getAdminLiveSessions,
  getAdminTraineeDetails,
  getAdminTrainees,
  getAdminWorkoutHistory,
  getStoredUser,
  updateAdminAiCoach
} from "../services/api";
import { createWorkoutSocket } from "../services/socket";

const emptyForm = {
  specialistId: null,
  name: "",
  domain: "training",
  specialty: "",
  description: "",
  rules: "",
  isActive: true
};

const coachResponseOptions = [
  "Reduce weight by 10% and continue carefully.",
  "Skip this exercise today and move to the next one.",
  "Lower the reps and stop if pain continues."
];

function asList(value, fallback = "None") {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : fallback;
}

function profileFor(trainee) {
  return trainee?.TraineeProfile || null;
}

function sessionUserId(session) {
  return Number(session?.userId || session?.User?.userId);
}

function traineeName(trainees, payload) {
  if (payload?.User) {
    return `${payload.User.firstName || ""} ${payload.User.lastName || ""}`.trim();
  }

  const userId = Number(payload?.userId);
  const trainee = trainees.find((item) => Number(item.userId) === userId);
  return trainee
    ? `${trainee.firstName || ""} ${trainee.lastName || ""}`.trim()
    : `Trainee #${userId || "unknown"}`;
}

function eventDetails(type, payload, trainees) {
  const name = traineeName(trainees, payload);

  if (type === "workout:started") {
    return {
      label: "Workout started",
      detail: `${name} started ${payload.selectedDayLabel || "a workout"}.`
    };
  }

  if (type === "setLog:created") {
    const exercise = payload.Exercise?.name || `Exercise #${payload.exerciseId || "-"}`;
    return {
      label: "Set logged",
      detail: `${name} logged ${exercise}: ${payload.weight ?? "-"} kg x ${payload.reps ?? "-"} reps (set ${payload.setNumber || "-"}).`
    };
  }

  if (type === "workout:progressUpdated") {
    return {
      label: "Progress updated",
      detail: `${name}: ${payload.completedSets || 0} / ${payload.totalSets || 0} sets completed.`
    };
  }

  if (type === "workout:issueReported") {
    return {
      label: "Issue reported",
      detail: `${name}: ${payload.message || "Workout issue reported."}`
    };
  }

  if (type === "workout:coachResponse") {
    return {
      label: "Coach response",
      detail: `${name}: ${payload.message || "Coach response sent."}`
    };
  }

  if (type === "workout:finished") {
    return {
      label: "Workout finished",
      detail: `${name} finished ${payload.selectedDayLabel || "the workout"} with ${payload.completedSets || 0} completed sets.`
    };
  }

  return {
    label: type,
    detail: `${name} sent a workout update.`
  };
}

const eventTypeOptions = [
  ["", "All activity"],
  ["workout:started", "Workout started"],
  ["setLog:created", "Set logged"],
  ["workout:progressUpdated", "Progress updated"],
  ["workout:finished", "Workout finished"],
  ["workout:issueReported", "Issue reported"],
  ["workout:coachResponse", "Coach response"]
];

const eventChipOptions = [
  ["", "All"],
  ["workout:started", "Started"],
  ["setLog:created", "Set Logged"],
  ["workout:progressUpdated", "Progress"],
  ["workout:finished", "Finished"],
  ["workout:issueReported", "Issues"],
  ["workout:coachResponse", "Responses"]
];

function initials(value) {
  return String(value || "Trainee")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function localDateKey(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function matchesDateFilter(value, dateFilter) {
  if (dateFilter === "all") {
    return true;
  }

  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (dateFilter === "today") {
    return localDateKey(date) === localDateKey(new Date());
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6);
  return date >= cutoff;
}

function sessionName(session) {
  return session?.User
    ? `${session.User.firstName || ""} ${session.User.lastName || ""}`.trim()
    : `Trainee #${session?.userId || "-"}`;
}

function sessionSearchText(session) {
  const exercises = Array.isArray(session?.SetLogs)
    ? session.SetLogs.map((log) => log.Exercise?.name || "").join(" ")
    : "";
  return [
    sessionName(session),
    session?.selectedDayLabel,
    session?.WorkoutPlan?.goal,
    exercises
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function eventTone(type) {
  if (type === "setLog:created") return "blue";
  if (type === "workout:issueReported") return "orange";
  if (type === "workout:coachResponse") return "blue";
  if (type === "workout:finished") return "dark";
  return "green";
}

function eventGlyph(type) {
  if (type === "workout:started") return "▶";
  if (type === "setLog:created") return "S";
  if (type === "workout:progressUpdated") return "↗";
  if (type === "workout:finished") return "✓";
  return "!";
}

function formatCompactDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  const today = localDateKey(date) === localDateKey(new Date());
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return today
    ? `Today, ${time}`
    : `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function sessionExerciseGroups(session) {
  const groups = new Map();
  (Array.isArray(session?.SetLogs) ? session.SetLogs : []).forEach((log) => {
    const name = log.Exercise?.name || `Exercise #${log.exerciseId}`;
    const current = groups.get(name) || [];
    current.push(log);
    groups.set(name, current);
  });
  return Array.from(groups.entries());
}

function planAssignments(plan) {
  if (Array.isArray(plan?.WorkoutPlanExercises)) {
    return plan.WorkoutPlanExercises;
  }

  return [];
}

function AdminDashboard() {
  const user = getStoredUser();
  const [aiCoaches, setAiCoaches] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [responseDrafts, setResponseDrafts] = useState({});
  const [selectedCoachId, setSelectedCoachId] = useState(null);
  const [monitorTraineeId, setMonitorTraineeId] = useState("");
  const [monitorActivity, setMonitorActivity] = useState("");
  const [monitorDate, setMonitorDate] = useState("today");
  const [monitorSearch, setMonitorSearch] = useState("");
  const [eventChip, setEventChip] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [selectedTraineeId, setSelectedTraineeId] = useState(null);
  const [traineeDetails, setTraineeDetails] = useState(null);
  const [traineeDetailStatus, setTraineeDetailStatus] = useState("idle");
  const [traineeDetailError, setTraineeDetailError] = useState("");
  const [traineeDetailRetry, setTraineeDetailRetry] = useState(0);
  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [activeTab, setActiveTab] = useState("live");
  const [socketStatus, setSocketStatus] = useState("connecting");
  const socketRef = useRef(null);

  async function loadDashboard({ preserveMessage = false } = {}) {
    setStatus("loading");
    if (!preserveMessage) {
      setMessage("");
    }

    try {
      const [coachData, traineeData, sessionData, historyData] = await Promise.all([
        getAdminAiCoaches(),
        getAdminTrainees(),
        getAdminLiveSessions(),
        getAdminWorkoutHistory()
      ]);
      setAiCoaches(coachData);
      setTrainees(traineeData);
      setLiveSessions(sessionData);
      setWorkoutHistory(historyData);
      setSelectedCoachId(
        (current) =>
          current ||
          coachData.find((specialist) => specialist.domain === "training")?.specialistId ||
          coachData[0]?.specialistId ||
          null
      );
      setStatus("ready");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (user?.userRole === "admin") {
      loadDashboard();
    } else {
      setStatus("forbidden");
    }
  }, [user?.userRole]);

  useEffect(() => {
    if (!selectedTraineeId) {
      setTraineeDetails(null);
      setTraineeDetailStatus("idle");
      setTraineeDetailError("");
      return;
    }

    let cancelled = false;
    setTraineeDetails(null);
    setTraineeDetailStatus("loading");
    setTraineeDetailError("");

    getAdminTraineeDetails(selectedTraineeId)
      .then((details) => {
        if (!cancelled) {
          setTraineeDetails(details);
          setTraineeDetailStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setTraineeDetailError(error.message);
          setTraineeDetailStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTraineeId, traineeDetailRetry]);

  useEffect(() => {
    if (user?.userRole !== "admin") {
      return undefined;
    }

    const socket = createWorkoutSocket("admin");
    socketRef.current = socket;
    socket.on("connect", async () => {
      setSocketStatus("connected");
      try {
        const [sessionData, historyData] = await Promise.all([
          getAdminLiveSessions(),
          getAdminWorkoutHistory()
        ]);
        setLiveSessions((current) => {
          const sessions = new Map(
            sessionData.map((session) => [session.workoutSessionId, session])
          );
          current.forEach((session) => {
            if (session.status !== "finished") {
              sessions.set(session.workoutSessionId, session);
            }
          });
          return Array.from(sessions.values());
        });
        setWorkoutHistory((current) => {
          const sessions = new Map(
            historyData.map((session) => [session.workoutSessionId, session])
          );
          current.forEach((session) => {
            sessions.set(session.workoutSessionId, session);
          });
          return Array.from(sessions.values());
        });
      } catch (error) {
        setMessage("Live connection restored, but persisted activity could not be refreshed.");
        setMessageType("error");
      }
    });
    socket.on("disconnect", () => setSocketStatus("offline"));
    socket.on("connect_error", () => setSocketStatus("reconnecting"));

    function addEvent(type, payload) {
      setEvents((current) =>
        [
          {
            id: `${type}-${Date.now()}-${Math.random()}`,
            type,
            payload,
            receivedAt: new Date().toISOString()
          },
          ...current
        ].slice(0, 30)
      );
    }

    function upsertSession(session) {
      setLiveSessions((current) => {
        if (session.status === "finished") {
          return current.filter(
            (item) => item.workoutSessionId !== session.workoutSessionId
          );
        }

        const exists = current.some(
          (item) => item.workoutSessionId === session.workoutSessionId
        );
        return exists
          ? current.map((item) =>
              item.workoutSessionId === session.workoutSessionId
                ? { ...item, ...session }
                : item
            )
          : [session, ...current];
      });
    }

    socket.on("workout:started", (session) => {
      upsertSession(session);
      setTraineeDetails((current) =>
        current && Number(current.trainee?.userId) === sessionUserId(session)
          ? { ...current, activeSession: session }
          : current
      );
      addEvent("workout:started", session);
    });
    socket.on("setLog:created", (setLog) => addEvent("setLog:created", setLog));
    socket.on("workout:progressUpdated", (progress) => {
      setLiveSessions((current) =>
        current.map((session) =>
          session.workoutSessionId === progress.workoutSessionId
            ? { ...session, ...progress }
            : session
        )
      );
      setTraineeDetails((current) =>
        current?.activeSession?.workoutSessionId === progress.workoutSessionId
          ? {
              ...current,
              activeSession: { ...current.activeSession, ...progress }
            }
          : current
      );
      addEvent("workout:progressUpdated", progress);
    });
    socket.on("workout:issueReported", (issue) =>
      addEvent("workout:issueReported", issue)
    );
    socket.on("workout:coachResponse", (response) =>
      addEvent("workout:coachResponse", response)
    );
    socket.on("workout:finished", (session) => {
      upsertSession(session);
      setWorkoutHistory((current) => [
        session,
        ...current.filter(
          (item) => item.workoutSessionId !== session.workoutSessionId
        )
      ]);
      setTraineeDetails((current) =>
        current && Number(current.trainee?.userId) === sessionUserId(session)
          ? {
              ...current,
              activeSession: null,
              workoutHistory: [
                session,
                ...(current.workoutHistory || []).filter(
                  (item) => item.workoutSessionId !== session.workoutSessionId
                )
              ]
            }
          : current
      );
      addEvent("workout:finished", session);
    });

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.disconnect();
    };
  }, [user?.userRole]);

  const selectedCoach = aiCoaches.find(
    (coach) => String(coach.specialistId) === String(selectedCoachId)
  );
  const assignedTrainees = useMemo(
    () =>
      trainees.filter(
        (trainee) =>
          String(profileFor(trainee)?.aiSpecialistId) === String(selectedCoachId)
      ),
    [selectedCoachId, trainees]
  );
  const normalizedSearch = monitorSearch.trim().toLowerCase();
  const filteredSessions = liveSessions.filter((session) => {
    const traineeMatches =
      !monitorTraineeId || sessionUserId(session) === Number(monitorTraineeId);
    const searchMatches =
      !normalizedSearch || sessionSearchText(session).includes(normalizedSearch);
    return traineeMatches && searchMatches;
  });
  const filteredEvents = events.filter((event) => {
    const typeFilter = eventChip || monitorActivity;
    const display = eventDetails(event.type, event.payload, trainees);
    const traineeMatches =
      !monitorTraineeId || Number(event.payload?.userId) === Number(monitorTraineeId);
    const activityMatches = !typeFilter || event.type === typeFilter;
    const dateMatches = matchesDateFilter(event.receivedAt, monitorDate);
    const searchMatches =
      !normalizedSearch ||
      `${display.label} ${display.detail}`.toLowerCase().includes(normalizedSearch);
    return traineeMatches && activityMatches && dateMatches && searchMatches;
  });
  const filteredHistory = workoutHistory.filter((session) => {
    const traineeMatches =
      !monitorTraineeId || sessionUserId(session) === Number(monitorTraineeId);
    const dateMatches = matchesDateFilter(
      session.finishedAt || session.startedAt,
      monitorDate
    );
    const searchMatches =
      !normalizedSearch || sessionSearchText(session).includes(normalizedSearch);
    return traineeMatches && dateMatches && searchMatches;
  });
  const visibleEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, 6);
  const visibleHistory = showAllHistory ? filteredHistory : filteredHistory.slice(0, 8);
  function updateResponseDraft(eventId, changes) {
    setResponseDrafts((current) => ({
      ...current,
      [eventId]: {
        ...(current[eventId] || {}),
        ...changes
      }
    }));
  }

  function handleCoachResponse(event) {
    const issue = event.payload || {};
    const draft = responseDrafts[event.id] || {};
    const cannedMessage = draft.canned || coachResponseOptions[0];
    const customMessage = String(draft.custom || "").trim();
    const messageText = customMessage || cannedMessage;

    if (!socketRef.current || socketStatus !== "connected") {
      setMessage("Live socket is not connected yet. Try again in a moment.");
      setMessageType("error");
      return;
    }

    if (!issue.workoutSessionId || !issue.userId || !messageText) {
      setMessage("This issue is missing session details for a coach response.");
      setMessageType("error");
      return;
    }

    socketRef.current.emit("workout:coachResponse", {
      issueId: issue.issueId,
      workoutSessionId: issue.workoutSessionId,
      userId: issue.userId,
      responseType: customMessage ? "custom" : "preset",
      message: messageText
    });

    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              payload: {
                ...item.payload,
                coachResponseSent: true,
                coachResponseMessage: messageText
              }
            }
          : item
      )
    );
    setResponseDrafts((current) => {
      const next = { ...current };
      delete next[event.id];
      return next;
    });
  }

  const issueCount = filteredHistory.reduce(
    (total, session) =>
      total +
      Number(
        session.issueCount ??
          (Array.isArray(session.WorkoutIssues) ? session.WorkoutIssues.length : 0)
      ),
    0
  );
  const unassignedTrainees = trainees.filter(
    (trainee) =>
      profileFor(trainee) &&
      String(profileFor(trainee)?.aiSpecialistId) !== String(selectedCoachId)
  );

  function startCreate() {
    setForm(emptyForm);
    setMessage("");
  }

  function startEdit(coach) {
    setSelectedCoachId(coach.specialistId);
    setForm({
      specialistId: coach.specialistId,
      name: coach.name,
      domain: coach.domain,
      specialty: coach.specialty,
      description: coach.description,
      rules: asList(coach.rules, ""),
      isActive: coach.isActive !== false
    });
  }

  function cancelEdit() {
    setForm(emptyForm);
    setMessage("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "isActive" ? value === "true" : value
    }));
  }

  async function handleSaveCoach(event) {
    event.preventDefault();
    setStatus("saving");
    const payload = {
      name: form.name.trim(),
      domain: form.domain.trim(),
      specialty: form.specialty.trim(),
      description: form.description.trim(),
      rules: form.rules
        .split(/[\n,]/)
        .map((rule) => rule.trim())
        .filter(Boolean),
      isActive: form.isActive
    };

    try {
      if (form.specialistId) {
        await updateAdminAiCoach(form.specialistId, payload);
      } else {
        await createAdminAiCoach(payload);
      }
      setForm(emptyForm);
      await loadDashboard({ preserveMessage: true });
      setMessage("AI specialist saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
      setStatus("ready");
    }
  }

  async function handleDeleteCoach(coach) {
    if (
      !window.confirm(
        `Delete ${coach.name}?${coach.assignedTraineeCount ? ` ${coach.assignedTraineeCount} trainee assignment(s) will be removed.` : ""}`
      )
    ) {
      return;
    }
    setStatus("saving");
    try {
      await deleteAdminAiCoach(coach.specialistId);
      setSelectedCoachId(null);
      setSelectedTraineeId(null);
      await loadDashboard({ preserveMessage: true });
      setMessage("AI specialist deleted successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
      setStatus("ready");
    }
  }

  async function handleAssignment(userId, aiSpecialistId) {
    setStatus("saving");
    try {
      await assignAiCoach(userId, aiSpecialistId);
      setAssignmentUserId("");
      await loadDashboard({ preserveMessage: true });
      setMessage("Trainee assignment updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
      setStatus("ready");
    }
  }

  if (status === "forbidden") {
    return <ErrorState message="Only admin users can access the Admin Dashboard." />;
  }

  if (status === "loading") {
    return <LoadingState label="Loading Admin Dashboard..." />;
  }

  if (status === "error") {
    return <ErrorState message={message} />;
  }

  const detailTrainee = traineeDetails?.trainee;
  const detailProfile = detailTrainee?.TraineeProfile;
  const plans = Array.isArray(detailTrainee?.WorkoutPlans)
    ? detailTrainee.WorkoutPlans
    : [];
  const latestPlan = plans.slice().sort((left, right) => right.planId - left.planId)[0];
  const latestPlanAssignments = planAssignments(latestPlan);
  const activeDayLabel = traineeDetails?.activeSession?.selectedDayLabel;
  const activeDayAssignments = activeDayLabel
    ? latestPlanAssignments.filter((assignment) => assignment.dayLabel === activeDayLabel)
    : [];

  return (
    <div className={`stack ${activeTab === "live" ? "admin-monitoring-page" : ""}`}>
      {activeTab === "live" ? (
        <header className="admin-monitoring-header">
          <div className="admin-monitoring-title">
            <h1>Admin Live Monitoring</h1>
            <span className={`socket-status socket-status--${socketStatus}`}>
              {socketStatus === "connected"
                ? "Live · Connected"
                : socketStatus === "reconnecting"
                  ? "Reconnecting"
                  : socketStatus === "connecting"
                    ? "Connecting"
                    : "Offline"}
            </span>
          </div>
        </header>
      ) : (
        <PageHeader
          eyebrow="Admin"
          title={activeTab === "specialists" ? "AI Specialist Administration" : "Trainee Details"}
          description={
            activeTab === "specialists"
              ? "Manage specialists and connect training coaches to trainees."
              : "Review trainee profiles, workout plans, active sessions, and history."
          }
        />
      )}

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {[
          ["live", "Live Monitoring"],
          ["specialists", "AI Specialists"],
          ["trainees", "Trainee Details"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={activeTab === value ? "active" : ""}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? <div className={`message message--${messageType}`}>{message}</div> : null}

      {activeTab === "specialists" ? (
        <>
      <section className="table-section">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">AI specialist management</p>
            <h2>AI Specialists</h2>
          </div>
          <button type="button" className="button button--ghost" onClick={startCreate}>
            New AI Specialist
          </button>
        </div>

        {aiCoaches.length === 0 ? (
          <EmptyState
            title="No AI specialists yet"
            message="Create a training or nutrition specialist to configure AI guidance."
          />
        ) : (
        <div className="coach-grid">
          {aiCoaches.map((coach) => (
            <article
              key={coach.specialistId}
              className={`trainee-monitor-card ${
                String(coach.specialistId) === String(selectedCoachId)
                  ? "admin-selection-card--selected"
                  : ""
              }`}
            >
              <button
                type="button"
                className="admin-card-select"
                onClick={() => {
                  setSelectedCoachId(coach.specialistId);
                  setSelectedTraineeId(null);
                }}
              >
                <span>{coach.specialty}</span>
                <strong>{coach.name}</strong>
              </button>
              <p>{coach.description}</p>
              <div className="chip-row">
                <Badge tone={coach.domain === "nutrition" ? "gold" : "mint"}>
                  {coach.domain}
                </Badge>
                <Badge tone={coach.isActive ? "mint" : "gold"}>
                  {coach.isActive ? "active" : "inactive"}
                </Badge>
                <Badge tone="mint">{coach.assignedTraineeCount} trainees</Badge>
              </div>
              {coach.domain === "nutrition" ? (
                <small>Used automatically by NutriScan when active.</small>
              ) : null}
              <small>{asList(coach.rules, "No guidance rules")}</small>
              <div className="button-row">
                <button type="button" className="button button--ghost" onClick={() => startEdit(coach)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => handleDeleteCoach(coach)}
                  disabled={status === "saving"}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        )}
      </section>

      <section className="admin-coach-grid">
        <form className="settings-page" onSubmit={handleSaveCoach}>
          <div className="section-heading">
            <p className="eyebrow">{form.specialistId ? "Edit specialist" : "Create specialist"}</p>
            <h2>AI Specialist Configuration</h2>
          </div>
          <label>
            Name
            <input name="name" value={form.name} onChange={handleFormChange} required />
          </label>
          <label>
            Specialty / goal focus
            <input name="specialty" value={form.specialty} onChange={handleFormChange} required />
          </label>
          <label>
            Domain
            <select name="domain" value={form.domain} onChange={handleFormChange} required>
              <option value="training">Training</option>
              <option value="nutrition">Nutrition</option>
            </select>
          </label>
          <label>
            Description
            <input name="description" value={form.description} onChange={handleFormChange} required />
          </label>
          <label>
            Instructions / emphasis / limitations
            <textarea name="rules" value={form.rules} onChange={handleFormChange} rows="5" />
          </label>
          <label>
            Status
            <select name="isActive" value={String(form.isActive)} onChange={handleFormChange}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <div className="admin-specialist-form-actions">
            <button type="submit" className="button button--primary" disabled={status === "saving"}>
              Save Specialist
            </button>
            {form.specialistId ? (
              <button type="button" className="button button--ghost" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <section className="table-section">
          <div className="section-heading">
            <p className="eyebrow">Selected specialist</p>
            <h2>{selectedCoach?.name || "Choose a specialist"}</h2>
          </div>

          {selectedCoach?.domain === "training" ? (
            <>
              <label>
                Assign trainee
                <select value={assignmentUserId} onChange={(event) => setAssignmentUserId(event.target.value)}>
                  <option value="">Choose a trainee</option>
                  {unassignedTrainees.map((trainee) => (
                    <option key={trainee.userId} value={trainee.userId}>
                      {trainee.firstName} {trainee.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button--primary"
                disabled={!assignmentUserId || status === "saving"}
                onClick={() => handleAssignment(Number(assignmentUserId), selectedCoach.specialistId)}
              >
                Assign to AI Coach
              </button>
              {assignedTrainees.length === 0 ? (
                <EmptyState title="No assigned trainees" message="Assign a trainee to this AI coach." />
              ) : (
                <div className="mini-list">
                  {assignedTrainees.map((trainee) => (
                    <div key={trainee.userId} className="mini-list__item">
                      <button
                        type="button"
                        className="admin-card-select"
                        onClick={() => {
                          setSelectedTraineeId(trainee.userId);
                          setActiveTab("trainees");
                        }}
                      >
                        <strong>{trainee.firstName} {trainee.lastName}</strong>
                        <span>{profileFor(trainee)?.goal || "Profile not completed"}</span>
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => handleAssignment(trainee.userId, null)}
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : selectedCoach ? (
            <EmptyState title="Nutrition specialist" message="Active nutrition specialists are selected automatically by NutriScan and are not assigned to trainee workout profiles." />
          ) : (
            <EmptyState title="Choose a specialist" message="Select a specialist card to review its configuration." />
          )}
        </section>
      </section>
        </>
      ) : null}

      {activeTab === "live" ? (
      <section className="admin-monitoring-workspace">
        <div className="admin-monitoring-filters">
          <div className="admin-filter-row">
            <label>
              Trainee
              <select
                value={monitorTraineeId}
                onChange={(event) => setMonitorTraineeId(event.target.value)}
              >
                <option value="">All trainees</option>
                {trainees.map((trainee) => (
                  <option key={trainee.userId} value={trainee.userId}>
                    {trainee.firstName} {trainee.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Activity
              <select
                value={monitorActivity}
                onChange={(event) => {
                  setMonitorActivity(event.target.value);
                  setEventChip(event.target.value);
                }}
              >
                {eventTypeOptions.map(([value, label]) => (
                  <option key={value || "all"} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <select value={monitorDate} onChange={(event) => setMonitorDate(event.target.value)}>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="all">All time</option>
              </select>
            </label>
            <label className="admin-search-field">
              <span className="sr-only">Search monitoring activity</span>
              <span className="admin-search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={monitorSearch}
                onChange={(event) => setMonitorSearch(event.target.value)}
                placeholder="Search events, workouts..."
              />
            </label>
          </div>

          <p className="admin-demo-note">
            Demo tip: keep Admin in the normal browser and open the trainee at <code>/training</code> in incognito or a separate profile.
          </p>
        </div>

        <div className="admin-kpi-grid">
          {[
            ["active", "↔", "Active Workouts", filteredSessions.length, "Right now"],
            ["events", "⌁", "Events Today", filteredEvents.length, "Live Socket.IO activity"],
            ["completed", "✓", "Completed Workouts", filteredHistory.length, "Persisted sessions"],
            ["issues", "!", "Issues Reported", issueCount, issueCount ? "Review reported issues" : "No open issues"]
          ].map(([tone, icon, label, value, detail]) => (
            <article className="admin-kpi-card" key={label}>
              <span className={`admin-kpi-icon admin-kpi-icon--${tone}`} aria-hidden="true">
                {icon}
              </span>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </div>
            </article>
          ))}
        </div>

          <div className="admin-monitoring-panels">
            <section className="admin-monitor-card">
              <div className="admin-monitor-card__header">
                <h2>Active Workouts ({filteredSessions.length})</h2>
              </div>
              {filteredSessions.length === 0 ? (
                <EmptyState
                  title="No active workouts"
                  message="Start a workout in the trainee client and it will appear here live."
                />
              ) : (
                <div className="admin-active-list">
                  {filteredSessions.slice(0, 4).map((session) => {
                    const name = sessionName(session);
                    const completed = Number(session.completedSets || 0);
                    const total = Number(session.totalSets || 0);
                    const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                    return (
                      <article className="admin-active-row" key={session.workoutSessionId}>
                        <span className="admin-trainee-avatar">{initials(name)}</span>
                        <div className="admin-active-person">
                          <strong>{name}</strong>
                          <span>{session.selectedDayLabel || session.WorkoutPlan?.goal || "Workout in progress"}</span>
                        </div>
                        <div className="admin-active-progress">
                          <span>Sets Completed</span>
                          <strong>{completed} / {total || "—"}</strong>
                          <div className="session-progress-bar" aria-hidden="true">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                          <small>{percent}%</small>
                        </div>
                        <button
                          type="button"
                          className="button button--ghost button--outline admin-row-action"
                          onClick={() => {
                            setSelectedTraineeId(sessionUserId(session));
                            setActiveTab("trainees");
                          }}
                        >
                          View details
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="admin-monitor-card">
                <div className="admin-monitor-card__header admin-events-header">
                  <h2>Recent Events</h2>
                  <div className="admin-event-chips">
                    {eventChipOptions.map(([value, label]) => (
                      <button
                        key={value || "all"}
                        type="button"
                        className={eventChip === value ? "active" : ""}
                        onClick={() => {
                          setEventChip(value);
                          setMonitorActivity(value);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleEvents.length === 0 ? (
                  <EmptyState
                    title="No live events yet"
                    message="Workout starts, sets, progress, issues, and finishes will appear here."
                  />
                ) : (
                  <>
                    <div className="admin-event-list">
                      {visibleEvents.map((event) => {
                        const display = eventDetails(event.type, event.payload, trainees);
                        const tone = eventTone(event.type);
                        const isIssue = event.type === "workout:issueReported" && !event.payload?.error;
                        const responseDraft = responseDrafts[event.id] || {};
                        const responseSent = Boolean(event.payload?.coachResponseSent);
                        return (
                          <article className="admin-event-row" key={event.id}>
                            <span className={`admin-event-glyph admin-event-glyph--${tone}`} aria-hidden="true">
                              {eventGlyph(event.type)}
                            </span>
                            <span className={`admin-event-chip admin-event-chip--${tone}`}>
                              {display.label.replace("Workout ", "")}
                            </span>
                            <p>{display.detail}</p>
                            <time>{new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                            {isIssue ? (
                              <div className="admin-issue-response">
                                {responseSent ? (
                                  <span>
                                    Response sent: {event.payload.coachResponseMessage}
                                  </span>
                                ) : (
                                  <>
                                    <select
                                      value={responseDraft.canned || coachResponseOptions[0]}
                                      onChange={(changeEvent) =>
                                        updateResponseDraft(event.id, { canned: changeEvent.target.value })
                                      }
                                    >
                                      {coachResponseOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      maxLength="180"
                                      value={responseDraft.custom || ""}
                                      onChange={(changeEvent) =>
                                        updateResponseDraft(event.id, { custom: changeEvent.target.value })
                                      }
                                      placeholder="Optional custom response"
                                    />
                                    <button
                                      type="button"
                                      className="button button--ghost button--outline"
                                      disabled={socketStatus !== "connected"}
                                      onClick={() => handleCoachResponse(event)}
                                    >
                                      Send response
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                    {filteredEvents.length > 6 ? (
                      <button
                        type="button"
                        className="admin-view-all"
                        onClick={() => setShowAllEvents((current) => !current)}
                      >
                        {showAllEvents ? "Show recent events" : "View all events"} →
                      </button>
                    ) : null}
                  </>
                )}
            </section>
          </div>

        <section className="admin-history-card">
            <div className="admin-monitor-card__header">
              <h2>Completed Workout History</h2>
              <span>{filteredHistory.length} result{filteredHistory.length === 1 ? "" : "s"}</span>
            </div>
            {filteredHistory.length === 0 ? (
              <EmptyState
                title="No completed workouts for these filters"
                message="Choose All time or finish a trainee workout to populate this table."
              />
            ) : (
              <div className="admin-history-table-shell">
                <table className="admin-history-table">
                  <thead>
                    <tr>
                      <th aria-label="Expand" />
                      <th>Trainee</th>
                      <th>Workout</th>
                      <th>Date &amp; Time</th>
                      <th>Completed Sets</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHistory.map((session) => {
                      const expanded = expandedHistoryId === session.workoutSessionId;
                      const name = sessionName(session);
                      const exerciseGroups = sessionExerciseGroups(session);
                      const issues = Array.isArray(session.WorkoutIssues) ? session.WorkoutIssues : [];
                      return (
                        <Fragment key={session.workoutSessionId}>
                          <tr>
                            <td>
                              <button
                                type="button"
                                className="admin-history-chevron"
                                aria-label={`${expanded ? "Collapse" : "Expand"} workout ${session.workoutSessionId}`}
                                onClick={() =>
                                  setExpandedHistoryId(expanded ? null : session.workoutSessionId)
                                }
                              >
                                {expanded ? "⌄" : "›"}
                              </button>
                            </td>
                            <td>
                              <span className="admin-history-trainee">
                                <span className="admin-trainee-avatar admin-trainee-avatar--small">{initials(name)}</span>
                                {name}
                              </span>
                            </td>
                            <td>{session.selectedDayLabel || session.WorkoutPlan?.goal || "Workout"}</td>
                            <td>{formatCompactDate(session.finishedAt || session.startedAt)}</td>
                            <td>{session.completedSets || 0} / {session.totalSets || session.completedSets || 0}</td>
                            <td><span className="admin-complete-status">Completed</span></td>
                            <td>
                              <button
                                type="button"
                                className="button button--ghost button--outline admin-row-action"
                                onClick={() =>
                                  setExpandedHistoryId(expanded ? null : session.workoutSessionId)
                                }
                              >
                                {expanded ? "Hide" : "View"}
                              </button>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="admin-history-detail-row">
                              <td colSpan="7">
                                <div className="admin-history-details">
                                  <div>
                                    <strong>Workout Details</strong>
                                    {exerciseGroups.length > 0 ? (
                                      exerciseGroups.map(([exercise]) => <span key={exercise}>{exercise}</span>)
                                    ) : (
                                      <span>No exercises were logged.</span>
                                    )}
                                  </div>
                                  <div>
                                    <strong>Completed Sets</strong>
                                    {exerciseGroups.flatMap(([, logs]) =>
                                      logs
                                        .slice()
                                        .sort((left, right) => left.setNumber - right.setNumber)
                                        .map((log) => (
                                          <span key={log.setLogId}>
                                            Set {log.setNumber}: {log.weight} kg x {log.reps} reps
                                          </span>
                                        ))
                                    )}
                                  </div>
                                  <div>
                                    <strong>Reported Issues</strong>
                                    {issues.length > 0
                                      ? issues.map((issue) => <span key={issue.issueId}>{issue.message}</span>)
                                      : <span>No issues reported.</span>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {filteredHistory.length > 8 ? (
                  <button
                    type="button"
                    className="admin-view-all admin-history-view-all"
                    onClick={() => setShowAllHistory((current) => !current)}
                  >
                    {showAllHistory ? "Show recent workouts" : "View all completed workouts"} →
                  </button>
                ) : null}
              </div>
            )}
        </section>
      </section>
      ) : null}

      {activeTab === "trainees" ? (
      <section className="table-section">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Selected trainee</p>
            <h2>{detailTrainee ? `${detailTrainee.firstName} ${detailTrainee.lastName}` : "Trainee Details"}</h2>
          </div>
          <div className="admin-trainee-actions">
            <label className="admin-trainee-selector">
              Choose trainee
              <select
                value={selectedTraineeId || ""}
                onChange={(event) =>
                  setSelectedTraineeId(event.target.value ? Number(event.target.value) : null)
                }
              >
                <option value="">Select a trainee</option>
                {trainees.map((trainee) => (
                  <option key={trainee.userId} value={trainee.userId}>
                    {trainee.firstName} {trainee.lastName}
                  </option>
                ))}
              </select>
            </label>
            {selectedTraineeId ? (
              <button
                type="button"
                className="button button--ghost button--outline"
                onClick={() => {
                  setMonitorTraineeId(String(selectedTraineeId));
                  setActiveTab("live");
                }}
              >
                View trainee activity
              </button>
            ) : null}
          </div>
        </div>
        {traineeDetailStatus === "idle" ? (
          <EmptyState
            title="Choose a trainee"
            message="Select any trainee to inspect profile, plan, active workout, and persisted history."
          />
        ) : traineeDetailStatus === "loading" ? (
          <LoadingState label="Loading trainee details..." />
        ) : traineeDetailStatus === "error" ? (
          <div className="stack">
            <ErrorState message={traineeDetailError} />
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setTraineeDetailRetry((current) => current + 1)}
            >
              Retry trainee details
            </button>
          </div>
        ) : !traineeDetails ? (
          <EmptyState title="No trainee details" message="No detail record was returned." />
        ) : (
          <>
            <div className="trainee-profile-grid">
              <span><strong>{detailProfile?.goal || "Not set"}</strong>Goal</span>
              <span><strong>{detailProfile?.level || "Not set"}</strong>Level</span>
              <span><strong>{detailProfile?.trainingDaysPerWeek || "-"}</strong>Days/week</span>
            </div>
            <div className="monitor-detail-list">
              <p><strong>Email:</strong> {detailTrainee.email}</p>
              <p><strong>Age:</strong> {detailProfile?.age || "Not set"}</p>
              <p><strong>Weight:</strong> {detailProfile?.weight || "Not set"}</p>
              <p><strong>Height:</strong> {detailProfile?.height || "Not set"}</p>
              <p><strong>Equipment:</strong> {asList(detailProfile?.equipmentAccess)}</p>
              <p><strong>Injuries:</strong> {asList(detailProfile?.injuries)}</p>
              <p><strong>Limitations:</strong> {asList(detailProfile?.limitations)}</p>
              <p><strong>Current AI coach:</strong> {detailProfile?.AiSpecialist?.name || "Unassigned"}</p>
            </div>

            <div className="section-heading">
              <h3>Current Workout Activity</h3>
            </div>
            {traineeDetails.activeSession ? (
              <article className="coach-session-card">
                <Badge tone="mint">active</Badge>
                <h3>{traineeDetails.activeSession.selectedDayLabel || "Workout in progress"}</h3>
                <p>
                  {traineeDetails.activeSession.completedSets || 0} /{" "}
                  {traineeDetails.activeSession.totalSets || 0} completed sets ·{" "}
                  {traineeDetails.activeSession.issueCount || 0} issues
                </p>
              </article>
            ) : (
              <p>No active workout session.</p>
            )}

            <div className="section-heading">
              <h3>Latest Workout Plan</h3>
            </div>
            {latestPlan ? (
              <>
              <div className="plan-preview-list plan-preview-list--summary">
                <span>Goal: {latestPlan.goal || detailProfile?.goal || "Not set"}</span>
                <span>{latestPlan.daysPerWeek || detailProfile?.trainingDaysPerWeek || "-"} days/week</span>
                <span>{latestPlanAssignments.length} planned exercises</span>
                {activeDayAssignments.length > 0 ? (
                  <div className="plan-active-day-preview">
                    <strong>{activeDayLabel} exercises</strong>
                    {activeDayAssignments.map((assignment) => (
                      <small key={assignment.workoutPlanExerciseId}>
                        {assignment.Exercise?.name || `Exercise #${assignment.exerciseId}`} - {assignment.targetSets} sets x {assignment.targetReps} reps
                      </small>
                    ))}
                  </div>
                ) : null}
              </div>
              {false ? (
              <div className="plan-preview-list">
                {planAssignments(latestPlan).map((assignment) => (
                  <span key={assignment.workoutPlanExerciseId}>
                    {assignment.dayLabel}: {assignment.Exercise?.name || `Exercise #${assignment.exerciseId}`} · {assignment.targetSets} sets · {assignment.targetReps} reps
                  </span>
                ))}
              </div>
              ) : null}
              </>
            ) : (
              <p>No workout plan generated yet.</p>
            )}

            <div className="section-heading">
              <h3>Completed Workout History</h3>
            </div>
            <WorkoutHistoryList sessions={traineeDetails.workoutHistory || []} />
          </>
        )}
      </section>
      ) : null}

    </div>
  );
}

export default AdminDashboard;
