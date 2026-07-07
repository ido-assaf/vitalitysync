const { Server } = require("socket.io");
const {
  Exercise,
  SetLog,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession
} = require("../models");
const { classifyAndAttachWorkoutIssueSignals } = require("./workoutIssueSignalService");
const { buildCoachResponseSuggestions } = require("./coachResponseSuggestionService");
const { resolveFitnessCoach } = require("./specialistResolutionService");
const { buildWorkoutSessionInclude } = require("../utils/workoutSessionInclude");

const ADMIN_ROOM = "admin-monitoring";
const TRAINEE_ROOM_PREFIX = "trainee-workout";

function traineeRoom(userId) {
  return `${TRAINEE_ROOM_PREFIX}:${userId}`;
}

function plain(record) {
  return record && typeof record.toJSON === "function" ? record.toJSON() : record;
}

async function getSessionPayload(workoutSessionId) {
  const session = await WorkoutSession.findByPk(workoutSessionId, {
    include: buildWorkoutSessionInclude({
      userAttributes: ["userId", "firstName", "lastName", "userRole"]
    })
  });

  return plain(session);
}

async function emitToAdmin(io, eventName, payload) {
  io.to(ADMIN_ROOM).emit(eventName, payload);
}

// Resolve the trainee's assigned AI fitness coach for auto-response attribution,
// falling back to any available fitness coach.
async function resolveAssignedSpecialist(userId) {
  const specialist = await resolveFitnessCoach({ userId });
  return specialist ? specialist.toJSON() : null;
}

// Fire-and-forget: classify the issue text, surface signals to the admin, and have the
// assigned AI Specialist auto-send a bounded, evidence-cited response to the trainee.
// Fully failure-safe: any error leaves the original issue flow untouched.
async function autoRespondToIssue(io, socket, issue) {
  const result = await classifyAndAttachWorkoutIssueSignals(issue);
  if (!result || !Array.isArray(result.signals) || result.signals.length === 0) {
    return;
  }

  await emitToAdmin(io, "workout:issueSignals", {
    issueId: issue.issueId,
    workoutSessionId: issue.workoutSessionId,
    userId: issue.userId,
    signals: result.signals
  });

  const [top] = await buildCoachResponseSuggestions({ issue, signals: result.signals });
  if (!top) {
    return;
  }

  const specialist = await resolveAssignedSpecialist(issue.userId);
  const base = {
    issueId: issue.issueId,
    workoutSessionId: issue.workoutSessionId,
    userId: issue.userId,
    workoutPlanId: issue.workoutPlanId,
    responseType: top.responseType,
    message: top.traineeMessage,
    senderRole: "ai_coach",
    specialistId: specialist?.specialistId || null,
    specialistName: specialist?.name || "AI Coach",
    sentAt: new Date().toISOString()
  };

  // Trainee gets the clean, actionable message only; the admin also sees the grounding.
  io.to(traineeRoom(issue.userId)).emit("workout:coachResponse", base);
  await emitToAdmin(io, "workout:coachResponse", {
    ...base,
    exercise: top.exercise || null,
    adminRationale: top.adminRationale,
    citations: top.citations
  });
}

async function updateProgress(workoutSessionId) {
  const completedSets = await SetLog.count({
    where: {
      workoutSessionId,
      completed: true
    }
  });
  const issueCount = await WorkoutIssue.count({ where: { workoutSessionId } });
  const session = await WorkoutSession.findByPk(workoutSessionId);

  if (!session) {
    return null;
  }

  await session.update({
    completedSets,
    issueCount
  });

  return {
    workoutSessionId,
    userId: session.userId,
    workoutPlanId: session.workoutPlanId,
    status: session.status,
    completedSets,
    totalSets: session.totalSets,
    issueCount,
    updatedAt: new Date().toISOString()
  };
}

async function getDayAssignments(workoutPlanId, selectedDayLabel) {
  return WorkoutPlanExercise.findAll({
    where: {
      workoutPlanId,
      dayLabel: selectedDayLabel
    },
    include: [{ model: Exercise }],
    order: [["orderIndex", "ASC"]]
  });
}

async function finishExistingSessions(io, userId) {
  const sessions = await WorkoutSession.findAll({
    where: {
      userId,
      status: "active"
    }
  });

  for (const session of sessions) {
    await session.update({
      status: "finished",
      finishedAt: new Date()
    });
    await updateProgress(session.workoutSessionId);

    const sessionPayload = await getSessionPayload(session.workoutSessionId);
    await emitToAdmin(io, "workout:finished", sessionPayload);
  }
}

function validPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function validNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function shortText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function emitError(socket, message, details = {}) {
  const payload = {
    error: true,
    message,
    details,
    reportedAt: new Date().toISOString()
  };

  socket.emit("workout:error", payload);
  socket.emit("workout:issueReported", payload);
}

function setupSocket(server, allowedOrigins) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    const role = socket.handshake.query.role;
    const socketUserId = validPositiveInteger(socket.handshake.query.userId);

    if (role === "admin") {
      socket.join(ADMIN_ROOM);
    }

    if (socketUserId) {
      socket.join(traineeRoom(socketUserId));
    }

    socket.on("workout:started", async (payload = {}) => {
      try {
        const userId = Number(payload.userId);
        const workoutPlanId = Number(payload.workoutPlanId);
        const selectedDayLabel = String(payload.selectedDayLabel || "").trim();
        const plan = await WorkoutPlan.findOne({
          where: {
            planId: workoutPlanId,
            userId
          }
        });

        if (!plan || selectedDayLabel === "") {
          emitError(socket, "Choose a valid workout day before starting.");
          return;
        }

        const existingSession = await WorkoutSession.findOne({
          where: { userId, status: "active" },
          order: [["startedAt", "DESC"]]
        });

        if (
          existingSession &&
          Number(existingSession.workoutPlanId) === workoutPlanId &&
          existingSession.selectedDayLabel === selectedDayLabel
        ) {
          socket.emit(
            "workout:started",
            await getSessionPayload(existingSession.workoutSessionId)
          );
          return;
        }

        if (existingSession && payload.replaceActive !== true) {
          emitError(
            socket,
            "You already have an active workout. Resume it or confirm replacing it.",
            { code: "ACTIVE_WORKOUT_EXISTS", workoutSessionId: existingSession.workoutSessionId }
          );
          return;
        }

        const dayAssignments = await getDayAssignments(workoutPlanId, selectedDayLabel);
        if (dayAssignments.length === 0) {
          emitError(socket, "The selected workout day has no assigned exercises.");
          return;
        }

        if (existingSession) {
          await finishExistingSessions(io, userId);
        }

        const totalSets = dayAssignments.reduce(
          (sum, assignment) => sum + Number(assignment.targetSets || 0),
          0
        );
        const session = await WorkoutSession.create({
          userId,
          workoutPlanId,
          selectedDayLabel,
          status: "active",
          startedAt: new Date(),
          totalSets
        });

        const sessionPayload = await getSessionPayload(session.workoutSessionId);
        await emitToAdmin(io, "workout:started", sessionPayload);
        socket.emit("workout:started", sessionPayload);
      } catch (error) {
        emitError(socket, "Could not start workout session.", { reason: error.message });
      }
    });

    socket.on("setLog:created", async (payload = {}) => {
      try {
        const workoutSessionId = validPositiveInteger(payload.workoutSessionId);
        const exerciseId = validPositiveInteger(payload.exerciseId);
        const setNumber = validPositiveInteger(payload.setNumber);
        const weight = validNonNegativeNumber(payload.weight);
        const reps = validPositiveInteger(payload.reps);

        if (!workoutSessionId || !exerciseId || !setNumber || weight === null || !reps) {
          emitError(socket, "Enter a valid exercise, set number, weight, and rep count.");
          return;
        }
        const session = await WorkoutSession.findByPk(workoutSessionId);

        if (!session || session.status !== "active") {
          emitError(socket, "Start an active workout before saving sets.");
          return;
        }

        const assignment = await WorkoutPlanExercise.findOne({
          where: {
            workoutPlanId: session.workoutPlanId,
            dayLabel: session.selectedDayLabel,
            exerciseId
          }
        });

        if (!assignment) {
          emitError(socket, "This exercise is not assigned to the selected workout day.");
          return;
        }

        if (setNumber > Number(assignment.targetSets || 0)) {
          emitError(socket, "All planned sets for this exercise are already complete.");
          return;
        }

        const duplicate = await SetLog.findOne({
          where: { workoutSessionId, exerciseId, setNumber }
        });

        if (duplicate) {
          emitError(socket, "This set was already saved.");
          return;
        }

        const setLog = await SetLog.create({
          userId: session.userId,
          workoutPlanId: session.workoutPlanId,
          exerciseId,
          workoutSessionId,
          setNumber,
          weight,
          reps,
          completed: true,
          logDate: new Date()
        });

        const logPayload = plain(
          await SetLog.findByPk(setLog.setLogId, {
            include: [{ model: Exercise }]
          })
        );
        const progressPayload = await updateProgress(workoutSessionId);

        await emitToAdmin(io, "setLog:created", logPayload);
        socket.emit("setLog:created", logPayload);

        if (progressPayload) {
          await emitToAdmin(io, "workout:progressUpdated", progressPayload);
          socket.emit("workout:progressUpdated", progressPayload);
        }
      } catch (error) {
        emitError(socket, "Could not save set log.", { reason: error.message });
      }
    });

    socket.on("workout:progressUpdated", async (payload = {}) => {
      try {
        const progressPayload = await updateProgress(Number(payload.workoutSessionId));

        if (progressPayload) {
          await emitToAdmin(io, "workout:progressUpdated", progressPayload);
          socket.emit("workout:progressUpdated", progressPayload);
        }
      } catch (error) {
        emitError(socket, "Could not update workout progress.", { reason: error.message });
      }
    });

    socket.on("workout:issueReported", async (payload = {}) => {
      try {
        const issue = await WorkoutIssue.create({
          workoutSessionId: Number(payload.workoutSessionId),
          userId: Number(payload.userId),
          workoutPlanId: Number(payload.workoutPlanId),
          message: String(payload.message || "").trim(),
          severity: payload.severity || "medium"
        });
        const progressPayload = await updateProgress(Number(payload.workoutSessionId));
        const issuePayload = plain(issue);

        await emitToAdmin(io, "workout:issueReported", issuePayload);
        socket.emit("workout:issueReported", issuePayload);

        if (progressPayload) {
          await emitToAdmin(io, "workout:progressUpdated", progressPayload);
        }

        // Fire-and-forget signal extraction + AI Specialist auto-response. Never blocks.
        autoRespondToIssue(io, socket, issue).catch(() => {});
      } catch (error) {
        emitError(socket, "Could not report workout issue.", { reason: error.message });
      }
    });

    socket.on("workout:coachResponse", async (payload = {}) => {
      try {
        if (role !== "admin") {
          emitError(socket, "Only admins can send coach responses.");
          return;
        }

        const workoutSessionId = validPositiveInteger(payload.workoutSessionId);
        const message = shortText(payload.message);

        if (!workoutSessionId || !message) {
          emitError(socket, "Choose an issue and enter a coach response.");
          return;
        }

        const session = await WorkoutSession.findByPk(workoutSessionId);
        if (!session) {
          emitError(socket, "Workout session was not found.");
          return;
        }

        const userId = validPositiveInteger(payload.userId) || session.userId;
        const responsePayload = {
          issueId: validPositiveInteger(payload.issueId),
          workoutSessionId,
          userId,
          workoutPlanId: session.workoutPlanId,
          responseType: shortText(payload.responseType, 40) || "custom",
          message,
          senderRole: "admin",
          sentAt: new Date().toISOString()
        };

        io.to(traineeRoom(userId)).emit("workout:coachResponse", responsePayload);
        await emitToAdmin(io, "workout:coachResponse", responsePayload);
      } catch (error) {
        emitError(socket, "Could not send coach response.", { reason: error.message });
      }
    });

    socket.on("workout:finished", async (payload = {}) => {
      try {
        const session = await WorkoutSession.findByPk(Number(payload.workoutSessionId));

        if (!session) {
          emitError(socket, "Workout session was not found.");
          return;
        }

        await session.update({
          status: "finished",
          finishedAt: new Date()
        });
        await updateProgress(session.workoutSessionId);

        const sessionPayload = await getSessionPayload(session.workoutSessionId);
        await emitToAdmin(io, "workout:finished", sessionPayload);
        socket.emit("workout:finished", sessionPayload);
      } catch (error) {
        emitError(socket, "Could not finish workout session.", { reason: error.message });
      }
    });
  });

  return io;
}

module.exports = {
  setupSocket
};
