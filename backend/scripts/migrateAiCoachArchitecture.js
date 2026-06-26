const path = require("path");
const { DataTypes } = require("sequelize");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const { AiSpecialist, sequelize, TraineeProfile, User } = require("../models");

const defaultTrainingSpecialists = [
  {
    name: "Strength Training AI Coach",
    specialty: "strength training",
    description: "Builds strength-focused plans around safe progressive overload and recovery.",
    rules: ["prioritize progressive overload", "respect injuries", "manage recovery"]
  },
  {
    name: "Running AI Coach",
    specialty: "running",
    description: "Guides running volume, recovery, and gradual endurance progression.",
    rules: ["increase volume gradually", "include easy sessions", "watch fatigue"]
  },
  {
    name: "Football AI Coach",
    specialty: "football",
    description: "Emphasizes strength, speed, agility, and football-specific conditioning.",
    rules: ["prioritize athletic movement", "include speed and agility", "manage impact"]
  },
  {
    name: "Basketball AI Coach",
    specialty: "basketball",
    description: "Emphasizes jumping, agility, strength, and basketball conditioning.",
    rules: ["develop lower-body power", "include agility", "manage jump volume"]
  },
  {
    name: "Weight Loss AI Coach",
    specialty: "weight loss",
    description: "Builds sustainable plans focused on consistency and manageable conditioning.",
    rules: ["favor sustainable volume", "include conditioning", "respect recovery"]
  },
  {
    name: "General Fitness AI Coach",
    specialty: "general fitness",
    description: "Builds balanced plans for general strength, mobility, and fitness.",
    rules: ["balance movement patterns", "respect limitations", "progress gradually"]
  }
];

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);

  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function ensureTrainingSpecialist(specialist) {
  const [record] = await AiSpecialist.findOrCreate({
    where: {
      domain: "training",
      specialty: specialist.specialty
    },
    defaults: {
      ...specialist,
      domain: "training",
      isActive: true
    }
  });

  return record;
}

async function migrateAiCoachArchitecture() {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();

  await ensureColumn(
    queryInterface,
    AiSpecialist.getTableName(),
    "isActive",
    {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  );
  await ensureColumn(
    queryInterface,
    TraineeProfile.getTableName(),
    "aiSpecialistId",
    {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  );

  for (const specialist of defaultTrainingSpecialists) {
    await ensureTrainingSpecialist(specialist);
  }

  const legacyCoaches = await User.findAll({
    where: { userRole: "coach" },
    attributes: ["userId", "firstName", "lastName", "coachSpecialty", "coachBio"]
  });

  for (const coach of legacyCoaches) {
    const specialty = String(coach.coachSpecialty || "general fitness").toLowerCase();
    const specialist = await ensureTrainingSpecialist({
      name: `${coach.firstName} ${coach.lastName} AI Coach`,
      specialty,
      description:
        coach.coachBio ||
        `AI workout specialist focused on ${specialty}.`,
      rules: ["respect injuries", "use trainee profile context", "progress gradually"]
    });

    await TraineeProfile.update(
      { aiSpecialistId: specialist.specialistId },
      {
        where: {
          coachId: coach.userId,
          aiSpecialistId: null
        }
      }
    );
  }
}

if (require.main === module) {
  migrateAiCoachArchitecture()
    .then(async () => {
      console.log("AI coach architecture migration complete.");
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error("AI coach architecture migration failed:", error);
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error("Could not close database connection:", closeError);
      }
      process.exit(1);
    });
}

module.exports = {
  migrateAiCoachArchitecture
};
