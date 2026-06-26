require("dotenv").config({ quiet: true });

const http = require("http");
const express = require("express");
const { initializeDatabase } = require("./config/initializeDatabase");
const logger = require("./middleware/logger");
const usersRoutes = require("./routes/usersRoutes");
const workoutPlansRoutes = require("./routes/workoutPlansRoutes");
const workoutSessionsRoutes = require("./routes/workoutSessionsRoutes");
const exercisesRoutes = require("./routes/exercisesRoutes");
const setLogsRoutes = require("./routes/setLogsRoutes");
const traineeProfilesRoutes = require("./routes/traineeProfilesRoutes");
const nutritionProfilesRoutes = require("./routes/nutritionProfilesRoutes");
const nutritionRoutes = require("./routes/nutritionRoutes");
const mealPlansRoutes = require("./routes/mealPlansRoutes");
const foodProductsRoutes = require("./routes/foodProductsRoutes");
const productEvaluationsRoutes = require("./routes/productEvaluationsRoutes");
const aiSpecialistsRoutes = require("./routes/aiSpecialistsRoutes");
const apiCompatibilityRoutes = require("./routes/apiCompatibilityRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { errorResponse, successResponse } = require("./models/response");
const { setupSocket } = require("./services/socketService");

const app = express();
const PORT = process.env.PORT || 3000;

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS;

  if (configuredOrigins) {
    return configuredOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];
}

const allowedOrigins = getAllowedOrigins();

app.disable("x-powered-by");

app.use(logger);
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.includes(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,x-user-id,x-user-role");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json(
    successResponse({
      message: "VitalitySync backend is running.",
      baseUrl: process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`
    })
  );
});

app.use("/users", usersRoutes);
app.use("/workout-plans", workoutPlansRoutes);
app.use("/workout-sessions", workoutSessionsRoutes);
app.use("/exercises", exercisesRoutes);
app.use("/set-logs", setLogsRoutes);
app.use("/trainee-profiles", traineeProfilesRoutes);
app.use("/nutrition-profiles", nutritionProfilesRoutes);
app.use("/nutrition", nutritionRoutes);
app.use("/meal-plans", mealPlansRoutes);
app.use("/food-products", foodProductsRoutes);
app.use("/product-evaluations", productEvaluationsRoutes);
app.use("/ai-specialists", aiSpecialistsRoutes);
app.use("/admin", adminRoutes);
app.use("/ai", aiRoutes);
app.use("/api", apiCompatibilityRoutes);

app.use((req, res) => {
  return res.status(404).json(
    errorResponse("NOT_FOUND", "The requested endpoint was not found.", {
      path: req.originalUrl
    })
  );
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Request body must contain valid JSON.")
    );
  }

  return res.status(500).json(
    errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred.")
  );
});

async function startServer() {
  const server = http.createServer(app);
  setupSocket(server, allowedOrigins);

  await initializeDatabase();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, () => {
      server.removeListener("error", reject);
      console.log(`VitalitySync backend running on port ${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer()
    .catch((error) => {
      console.error("Backend startup failed:", error);
      process.exit(1);
    });
}

module.exports = app;
module.exports.startServer = startServer;
