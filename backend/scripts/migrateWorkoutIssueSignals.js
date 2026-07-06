const path = require("path");
const { DataTypes } = require("sequelize");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const { sequelize } = require("../models");

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);

  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function migrateWorkoutIssueSignals() {
  const queryInterface = sequelize.getQueryInterface();

  await ensureColumn(queryInterface, "WorkoutIssue", "signals", {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  });

  await ensureColumn(queryInterface, "AiSpecialistSignalPattern", "scope", {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: "weekly_check_in"
  });
}

if (require.main === module) {
  migrateWorkoutIssueSignals()
    .then(async () => {
      console.log("Workout issue signals migration complete.");
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error("Workout issue signals migration failed:", error);
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error("Could not close database connection:", closeError);
      }
      process.exit(1);
    });
}

module.exports = {
  migrateWorkoutIssueSignals
};
