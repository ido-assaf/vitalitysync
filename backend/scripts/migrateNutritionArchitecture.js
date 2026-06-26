const path = require("path");
const { DataTypes } = require("sequelize");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const {
  AiSpecialist,
  NutritionFavorite,
  NutritionLogItem,
  NutritionProfile,
  TraineeProfile,
  sequelize
} = require("../models");

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);

  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function ensureLogTable(queryInterface) {
  const tables = (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );
  const tableName = NutritionLogItem.getTableName();

  if (!tables.includes(tableName)) {
    await NutritionLogItem.sync();
  }
}

async function ensureFavoriteTable(queryInterface) {
  const tables = (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

  if (!tables.includes(NutritionFavorite.getTableName())) {
    await NutritionFavorite.sync();
  }
}

async function ensureLogIndex(queryInterface) {
  const tableName = NutritionLogItem.getTableName();
  const indexes = await queryInterface.showIndex(tableName);

  if (!indexes.some((index) => index.name === "nutrition_log_user_date")) {
    await queryInterface.addIndex(tableName, ["userId", "consumedDate"], {
      name: "nutrition_log_user_date"
    });
  }
}

async function migrateNutritionArchitecture() {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  const profileTable = NutritionProfile.getTableName();
  const traineeProfileTable = TraineeProfile.getTableName();

  await ensureColumn(queryInterface, traineeProfileTable, "biologicalSex", {
    type: DataTypes.STRING,
    allowNull: true
  });

  await ensureColumn(queryInterface, profileTable, "dailyCaloriesTarget", {
    type: DataTypes.FLOAT,
    allowNull: true
  });
  await ensureColumn(queryInterface, profileTable, "dailyProteinTarget", {
    type: DataTypes.FLOAT,
    allowNull: true
  });
  await ensureColumn(queryInterface, profileTable, "allergies", {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  });
  await ensureLogTable(queryInterface);
  const logTable = NutritionLogItem.getTableName();
  await ensureColumn(queryInterface, logTable, "imageUrl", {
    type: DataTypes.TEXT,
    allowNull: true
  });
  await ensureColumn(queryInterface, logTable, "guidanceSource", {
    type: DataTypes.STRING,
    allowNull: true
  });
  await ensureColumn(queryInterface, logTable, "portionDescription", {
    type: DataTypes.STRING,
    allowNull: true
  });
  await ensureColumn(queryInterface, logTable, "originalDescription", {
    type: DataTypes.TEXT,
    allowNull: true
  });
  await ensureColumn(queryInterface, logTable, "estimateConfidence", {
    type: DataTypes.STRING,
    allowNull: true
  });
  await ensureColumn(queryInterface, logTable, "estimateAssumptions", {
    type: DataTypes.JSON,
    allowNull: true
  });
  const logColumns = await queryInterface.describeTable(logTable);
  if (logColumns.servingGrams && logColumns.servingGrams.allowNull === false) {
    await queryInterface.changeColumn(logTable, "servingGrams", {
      type: DataTypes.FLOAT,
      allowNull: true
    });
  }
  await ensureLogIndex(queryInterface);
  await ensureFavoriteTable(queryInterface);
  await AiSpecialist.findOrCreate({
    where: {
      domain: "nutrition",
      specialty: "sports nutrition"
    },
    defaults: {
      name: "VitalitySync Nutritionist",
      domain: "nutrition",
      specialty: "sports nutrition",
      description: "Provides practical nutrition guidance grounded in verified food data.",
      rules: [
        "use supplied nutrition values only",
        "consider the daily food log",
        "avoid medical advice"
      ],
      isActive: true
    }
  });
}

if (require.main === module) {
  migrateNutritionArchitecture()
    .then(async () => {
      console.log("Nutrition architecture migration complete.");
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error("Nutrition architecture migration failed:", error);
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error("Could not close database connection:", closeError);
      }
      process.exit(1);
    });
}

module.exports = {
  migrateNutritionArchitecture
};
