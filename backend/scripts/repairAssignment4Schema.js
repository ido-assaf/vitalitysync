const path = require("path");
const { DataTypes } = require("sequelize");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const { sequelize, User } = require("../models");
const { backfillEmptySuggestedPlans } = require("../controllers/workoutPlansController");
const { seedCuratedExercises } = require("../seed/curatedExercises");

const USER_TABLE = "User";
const EXERCISE_TABLE = "Exercise";
const WORKOUT_SESSION_TABLE = "WorkoutSession";

const userColumnDefinitions = {
  coachId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  coachSpecialty: {
    type: DataTypes.STRING,
    allowNull: true
  },
  coachBio: {
    type: DataTypes.TEXT,
    allowNull: true
  }
};

const exerciseColumnDefinitions = {
  mainMuscleGroup: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subMuscleGroup: {
    type: DataTypes.STRING,
    allowNull: true
  },
  level: {
    type: DataTypes.STRING,
    allowNull: true
  },
  movementPattern: {
    type: DataTypes.STRING,
    allowNull: true
  },
  goalTags: {
    type: DataTypes.JSON,
    allowNull: true
  },
  instructions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gifUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true
  },
  license: {
    type: DataTypes.STRING,
    allowNull: true
  }
};

const workoutSessionColumnDefinitions = {
  selectedDayLabel: {
    type: DataTypes.STRING,
    allowNull: true
  }
};

const demoUsers = [
  {
    userId: 1,
    firstName: "Student",
    lastName: "Admin",
    email: "student@example.com",
    password: "123456",
    username: "student.admin",
    theme: "system",
    userRole: "admin",
    coachId: null,
    coachSpecialty: null,
    coachBio: null
  },
  {
    userId: 3,
    firstName: "Demo",
    lastName: "Trainee",
    email: "demo.trainee@example.com",
    password: "password123",
    username: "demo.trainee",
    theme: "system",
    userRole: "trainee",
    coachId: null,
    coachSpecialty: null,
    coachBio: null
  }
];

async function ensureColumn(queryInterface, tableName, existingColumns, columnName, definition) {
  if (existingColumns[columnName]) {
    console.log(`Column already exists: ${tableName}.${columnName}`);
    return false;
  }

  await queryInterface.addColumn(tableName, columnName, definition);
  console.log(`Added column: ${tableName}.${columnName}`);
  return true;
}

async function ensureDemoUser(demoUser) {
  const existingUser = await User.scope("withPassword").findByPk(demoUser.userId);

  if (!existingUser) {
    await User.create(demoUser);
    console.log(`Created demo user #${demoUser.userId}: ${demoUser.userRole}`);
    return;
  }

  const updates = {};
  Object.entries(demoUser).forEach(([field, value]) => {
    if (existingUser[field] !== value) {
      updates[field] = value;
    }
  });

  if (Object.keys(updates).length === 0) {
    console.log(`Demo user #${demoUser.userId} already matches expected role/coach data.`);
    return;
  }

  await existingUser.update(updates);
  console.log(`Updated demo user #${demoUser.userId}: ${Object.keys(updates).join(", ")}`);
}

async function repairAssignment4Schema() {
  const queryInterface = sequelize.getQueryInterface();

  await sequelize.authenticate();
  console.log("Connected to MySQL.");

  const existingColumns = await queryInterface.describeTable(USER_TABLE);

  for (const [columnName, definition] of Object.entries(userColumnDefinitions)) {
    await ensureColumn(queryInterface, USER_TABLE, existingColumns, columnName, definition);
  }

  for (const demoUser of demoUsers) {
    await ensureDemoUser(demoUser);
  }

  const existingExerciseColumns = await queryInterface.describeTable(EXERCISE_TABLE);

  for (const [columnName, definition] of Object.entries(exerciseColumnDefinitions)) {
    await ensureColumn(
      queryInterface,
      EXERCISE_TABLE,
      existingExerciseColumns,
      columnName,
      definition
    );
  }

  const existingWorkoutSessionColumns = await queryInterface.describeTable(
    WORKOUT_SESSION_TABLE
  );

  for (const [columnName, definition] of Object.entries(workoutSessionColumnDefinitions)) {
    await ensureColumn(
      queryInterface,
      WORKOUT_SESSION_TABLE,
      existingWorkoutSessionColumns,
      columnName,
      definition
    );
  }

  await seedCuratedExercises();
  console.log("Curated Free Exercise DB seed is present.");

  const backfillResults = await backfillEmptySuggestedPlans();
  const repairedPlans = backfillResults.filter((result) => result.status === "backfilled");

  if (repairedPlans.length > 0) {
    repairedPlans.forEach((result) => {
      console.log(
        `Backfilled suggested plan #${result.planId} with ${result.assignmentCount} exercise assignments.`
      );
    });
  } else {
    console.log("No empty suggested workout plans needed exercise assignment backfill.");
  }

  console.log("Assignment 4 schema repair complete.");
}

if (require.main === module) {
  repairAssignment4Schema()
    .then(async () => {
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error("Assignment 4 schema repair failed:", error);
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error("Could not close database connection:", closeError);
      }
      process.exit(1);
    });
}

module.exports = {
  repairAssignment4Schema
};
