import EmptyState from "./EmptyState";

function startOfWeek(value) {
  const date = new Date(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function weekLabel(weekStart) {
  const currentWeek = startOfWeek(new Date());
  const difference = Math.round((currentWeek - weekStart) / (7 * 24 * 60 * 60 * 1000));

  if (difference === 0) {
    return "This week";
  }

  if (difference === 1) {
    return "Last week";
  }

  if (difference > 1 && difference < 5) {
    return `${difference} weeks ago`;
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
}

function groupSessionsByWeek(sessions) {
  const groups = new Map();

  sessions.forEach((session) => {
    const date = session.finishedAt || session.startedAt;
    const weekStart = startOfWeek(date);
    const key = weekStart.toISOString().slice(0, 10);
    const group = groups.get(key) || { weekStart, sessions: [] };
    group.sessions.push(session);
    groups.set(key, group);
  });

  return Array.from(groups.values()).sort((left, right) => right.weekStart - left.weekStart);
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function WorkoutDetails({ session, showUser }) {
  const setLogs = Array.isArray(session.SetLogs) ? session.SetLogs : [];
  const issues = Array.isArray(session.WorkoutIssues) ? session.WorkoutIssues : [];
  const exerciseGroups = setLogs.reduce((groups, log) => {
    const name = log.Exercise?.name || `Exercise #${log.exerciseId}`;
    const current = groups.get(name) || [];
    current.push(log);
    groups.set(name, current);
    return groups;
  }, new Map());

  return (
    <article className="history-workout-card">
      <div className="history-workout-card__header">
        <div>
          <span>{session.selectedDayLabel || "Workout"}</span>
          <strong>{formatDateTime(session.startedAt)}</strong>
        </div>
        <span>{session.completedSets || setLogs.length} completed sets</span>
      </div>

      {showUser && session.User ? (
        <p className="history-workout-card__trainee">
          {session.User.firstName} {session.User.lastName}
        </p>
      ) : null}

      <p className="history-workout-card__time">
        Finished: {formatDateTime(session.finishedAt)}
      </p>

      {exerciseGroups.size > 0 ? (
        <div className="history-exercise-list">
          {Array.from(exerciseGroups.entries()).map(([name, logs]) => (
            <section key={`${session.workoutSessionId}-${name}`}>
              <strong>{name}</strong>
              <div className="history-set-list">
                {logs
                  .slice()
                  .sort((left, right) => left.setNumber - right.setNumber)
                  .map((log) => (
                    <span key={log.setLogId}>
                      Set {log.setNumber}: {log.weight} kg x {log.reps} reps
                    </span>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p>No sets were logged for this workout.</p>
      )}

      {issues.length > 0 ? (
        <div className="history-issues">
          <strong>Reported issues</strong>
          {issues.map((issue) => (
            <p key={issue.issueId}>{issue.message}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function WorkoutHistoryList({ sessions, showUser = false }) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return (
      <EmptyState
        title="No completed workouts yet"
        message="Finished workouts will appear here with their persisted sets."
      />
    );
  }

  return (
    <div className="weekly-history-list">
      {groupSessionsByWeek(sessions).map((group, index) => (
        <details className="history-week" key={group.weekStart.toISOString()} open={index === 0}>
          <summary>
            <strong>{weekLabel(group.weekStart)}</strong>
            <span>
              {group.sessions.length} workout{group.sessions.length === 1 ? "" : "s"}
            </span>
          </summary>
          <div className="history-week__content">
            {group.sessions.map((session) => (
              <WorkoutDetails
                key={session.workoutSessionId}
                session={session}
                showUser={showUser}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export default WorkoutHistoryList;
