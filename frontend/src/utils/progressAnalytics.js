const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function startOfWeek(value) {
  const date = new Date(value);
  const day = date.getDay();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

function normalizedSessions(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((session) => session.status === "finished" || session.finishedAt)
    .map((session) => ({
      ...session,
      date: new Date(session.finishedAt || session.startedAt)
    }))
    .filter((session) => !Number.isNaN(session.date.getTime()));
}

function completedLogs(sessions) {
  return sessions.flatMap((session) =>
    (Array.isArray(session.SetLogs) ? session.SetLogs : [])
      .filter((log) => log.completed !== false)
      .map((log) => {
        const weight = Number(log.weight);
        const reps = Number(log.reps);
        const date = new Date(log.logDate || session.date);

        if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps <= 0) {
          return null;
        }

        return {
          ...log,
          date,
          exerciseId: log.exerciseId ?? log.Exercise?.exerciseId,
          exerciseName: log.Exercise?.name || `Exercise #${log.exerciseId}`,
          reps,
          sessionId: session.workoutSessionId,
          sessionDate: session.date,
          volume: weight > 0 ? weight * reps : 0,
          weight
        };
      })
      .filter(Boolean)
  );
}

function between(items, start, end, key = "date") {
  return items.filter((item) => item[key] >= start && item[key] < end);
}

function sumVolume(logs) {
  return logs.reduce((total, log) => total + log.volume, 0);
}

function bestSet(logs) {
  return logs
    .filter((log) => log.weight > 0)
    .slice()
    .sort((left, right) =>
      right.weight - left.weight || right.reps - left.reps || right.date - left.date
    )[0] || null;
}

function buildExerciseSeries(logs) {
  const exercises = new Map();

  logs.forEach((log) => {
    const key = String(log.exerciseId || log.exerciseName);
    const exercise = exercises.get(key) || {
      exerciseId: log.exerciseId,
      exerciseName: log.exerciseName,
      sessions: new Map()
    };
    const session = exercise.sessions.get(log.sessionId) || {
      date: log.sessionDate,
      sets: []
    };
    session.sets.push(log);
    exercise.sessions.set(log.sessionId, session);
    exercises.set(key, exercise);
  });

  return Array.from(exercises.values()).map((exercise) => {
    const sessions = Array.from(exercise.sessions.values())
      .map((session) => ({ ...session, best: bestSet(session.sets) }))
      .filter((session) => session.best)
      .sort((left, right) => left.date - right.date);

    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sessions,
      recentSessions: sessions.slice(-6)
    };
  });
}

function classifyChange(previous, latest) {
  if (latest.weight > previous.weight && latest.reps >= previous.reps) {
    return {
      label: "Improved load",
      tone: "positive",
      weightChange: latest.weight - previous.weight,
      repsChange: latest.reps - previous.reps,
      improvementRank: 2
    };
  }
  if (latest.weight === previous.weight && latest.reps > previous.reps) {
    return {
      label: "More reps",
      tone: "positive",
      weightChange: 0,
      repsChange: latest.reps - previous.reps,
      improvementRank: 1
    };
  }
  if (latest.weight === previous.weight && latest.reps === previous.reps) {
    return {
      label: "Same performance",
      tone: "neutral",
      weightChange: 0,
      repsChange: 0,
      improvementRank: 0
    };
  }
  return {
    label: "Mixed change",
    tone: "neutral",
    weightChange: latest.weight - previous.weight,
    repsChange: latest.reps - previous.reps,
    improvementRank: 0
  };
}

export function calculateProgressAnalytics(sessions, selectedWeek = new Date()) {
  const allSessions = normalizedSessions(sessions);
  const logs = completedLogs(allSessions);
  const weekStart = startOfWeek(selectedWeek);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  const weekSessions = between(allSessions, weekStart, weekEnd);
  const weekLogs = logs.filter((log) => log.date >= weekStart && log.date < weekEnd);
  const previousWeekLogs = logs.filter(
    (log) => log.date >= previousWeekStart && log.date < weekStart
  );
  const currentWeekVolume = sumVolume(weekLogs);
  const previousWeekVolume = sumVolume(previousWeekLogs);
  const volumeChangePercent = previousWeekVolume > 0
    ? ((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100
    : null;
  const dailyVolume = DAY_LABELS.map((label, index) => {
    const start = new Date(weekStart.getTime() + index * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    const dayLogs = weekLogs.filter((log) => log.date >= start && log.date < end);
    const daySessions = weekSessions.filter(
      (session) => session.date >= start && session.date < end
    );
    return {
      label,
      date: start,
      volume: sumVolume(dayLogs),
      completedSetCount: dayLogs.length,
      workoutLabels: Array.from(
        new Set(
          daySessions.map(
            (session) => session.selectedDayLabel || `Workout #${session.workoutSessionId}`
          )
        )
      ),
      active: daySessions.length > 0
    };
  });
  const exerciseSeries = buildExerciseSeries(logs);
  const exerciseChanges = exerciseSeries
    .filter((exercise) => exercise.sessions.length >= 2)
    .map((exercise) => {
      const previous = exercise.sessions.at(-2).best;
      const latest = exercise.sessions.at(-1).best;
      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        previous,
        latest,
        ...classifyChange(previous, latest)
      };
    })
    .sort((left, right) => right.latest.date - left.latest.date);
  const bestImprovement =
    exerciseChanges
      .filter((change) => change.improvementRank > 0)
      .slice()
      .sort(
        (left, right) =>
          right.improvementRank - left.improvementRank ||
          right.weightChange - left.weightChange ||
          right.repsChange - left.repsChange ||
          right.latest.date - left.latest.date
      )[0] || null;
  const achievements = [];

  if (volumeChangePercent > 0) {
    achievements.push(`Weekly training volume increased by ${volumeChangePercent.toFixed(1)}%.`);
  }

  exerciseChanges
    .filter((change) => change.tone === "positive")
    .slice(0, 2)
    .forEach((change) => {
      achievements.push(
        change.label === "More reps"
          ? `${change.exerciseName}: more reps at ${change.latest.weight} kg.`
          : `${change.exerciseName}: ${change.previous.weight} kg to ${change.latest.weight} kg with reps maintained.`
      );
    });

  const activeDays = dailyVolume.filter((day) => day.active).length;
  if (activeDays >= 2) {
    achievements.push(`Completed workouts on ${activeDays} different days this week.`);
  }

  const clearestImprovement = bestImprovement;
  let coachInsight = "Keep logging completed sets to build a reliable training baseline.";
  if (clearestImprovement) {
    coachInsight = `${clearestImprovement.exerciseName} shows the clearest recent progress. Keep the next increase controlled and maintain your current rep quality.`;
  } else if (volumeChangePercent !== null) {
    coachInsight = volumeChangePercent >= 0
      ? "Your weekly workload is holding steady or rising. Prioritize recovery before adding more volume."
      : "This week is lighter than the previous one. That can support recovery, but keep your planned sessions consistent.";
  }

  return {
    achievements,
    activeDays,
    bestImprovement,
    bodyweightSetCount: weekLogs.filter((log) => log.weight === 0).length,
    coachInsight,
    currentWeekVolume,
    dailyVolume,
    exerciseChanges,
    exerciseSeries: exerciseSeries
      .filter((exercise) => exercise.recentSessions.length > 0)
      .sort((left, right) => right.recentSessions.length - left.recentSessions.length),
    heaviestSet: bestSet(weekLogs),
    logCount: logs.length,
    previousWeekVolume,
    selectedWeekStart: weekStart,
    volumeChangePercent,
    weightedSetCount: weekLogs.filter((log) => log.weight > 0).length,
    weekSessionCount: weekSessions.length,
    weekSessions: weekSessions.map((session) => ({
      workoutPlanId: session.workoutPlanId,
      selectedDayLabel: session.selectedDayLabel,
      workoutSessionId: session.workoutSessionId
    }))
  };
}
