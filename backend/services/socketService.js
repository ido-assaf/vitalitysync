const { Server } = require("socket.io");
const {
  Exercise,
  SetLog,
  User,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession
} = require("../models");

const ADMIN_ROOM = "admin-monitoring";

function plain(record) {
  return record && typeof record.toJSON === "function" ? record.toJSON() : record;
}

async function getSessionPayload(workoutSessionId) {
  const session = await WorkoutSession.findByPk(workoutSessionId, {
    include: [
      { model: User, attributes: ["userId", "firstName", "lastName", "userRole"] },
      { model: WorkoutPlan },
      { model: SetLog, include: [{ model: Exercise }] },
      { model: WorkoutIssue }
    ]
  });

  return plain(session);
}

async function emitToAdmin(io, eventName, payload) {
  io.to(ADMIN_ROOM).emit(eventName, payload);
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

function emitError(socket, message, details = {}) {
  socket.emit("workout:issueReported", {
    error: true,
    message,
    details,
    reportedAt: new Date().toISOString()
  });
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

    if (role === "admin") {
      socket.join(ADMIN_ROOM);
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
      } catch (error) {
        emitError(socket, "Could not report workout issue.", { reason: error.message });
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
