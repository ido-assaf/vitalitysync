const { sequelize } = require("../models");
const { seedDatabase } = require("../seed/seedDatabase");
const { migrateAiCoachArchitecture } = require("../scripts/migrateAiCoachArchitecture");
const { migrateNutritionArchitecture } = require("../scripts/migrateNutritionArchitecture");

async function initializeDatabase() {
  await sequelize.authenticate();

  const shouldSync =
    process.env.DB_SYNC === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.DB_SYNC !== "false");

  if (shouldSync) {
    await sequelize.sync({ alter: process.env.DB_ALTER === "true" });
  }

  if (process.env.DB_SEED === "true") {
    await seedDatabase();
  }

  await migrateAiCoachArchitecture();
  await migrateNutritionArchitecture();
}

module.exports = {
  initializeDatabase
};
