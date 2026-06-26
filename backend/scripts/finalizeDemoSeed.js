const path = require("path");
const { Op } = require("sequelize");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const {
  AiSpecialist,
  MealPlan,
  NutritionFavorite,
  NutritionLogItem,
  NutritionProfile,
  ProductEvaluation,
  SetLog,
  TraineeProfile,
  User,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession,
  sequelize
} = require("../models");

const APPLY_ARGUMENT = "--apply";
const CONFIRM_ARGUMENT = "--confirm=final-demo";

const finalAdmin = {
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
};

const finalTrainee = {
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
};

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

function printUsage() {
  console.log("Finalize production demo data without human coach users.");
  console.log("");
  console.log("Dry run, rolls back all changes:");
  console.log("  node scripts/finalizeDemoSeed.js");
  console.log("");
  console.log("Apply changes:");
  console.log(`  node scripts/finalizeDemoSeed.js ${APPLY_ARGUMENT} ${CONFIRM_ARGUMENT}`);
}

function changedCount(result) {
  return Array.isArray(result) ? result[0] : result;
}

function addSummary(summary, label, count) {
  summary.push({ label, count: Number(count || 0) });
}

async function assertNoUserConflict(field, value, userId, transaction) {
  const conflict = await User.unscoped().findOne({
    where: {
      [field]: value,
      userId: { [Op.ne]: userId }
    },
    transaction
  });

  if (conflict) {
    throw new Error(
      `Cannot set ${field}="${value}" for user #${userId}; user #${conflict.userId} already uses it.`
    );
  }
}

async function findUser(target, legacyUsernames, transaction) {
  return User.scope("withPassword").findOne({
    where: {
      [Op.or]: [
        { username: target.username },
        { userId: target.userId },
        { username: { [Op.in]: legacyUsernames } }
      ]
    },
    order: [["userId", "ASC"]],
    transaction
  });
}

async function ensureUser(target, legacyUsernames, transaction, summary) {
  let user = await findUser(target, legacyUsernames, transaction);

  if (!user) {
    user = await User.create(target, { transaction });
    addSummary(summary, `created ${target.username}`, 1);
    return user;
  }

  await assertNoUserConflict("username", target.username, user.userId, transaction);
  await assertNoUserConflict("email", target.email, user.userId, transaction);
  const { userId, ...updates } = target;
  await user.update(updates, { transaction });
  addSummary(summary, `updated ${target.username}`, 1);
  return user;
}

async function ensureTrainingSpecialists(transaction, summary) {
  const specialists = {};

  for (const specialist of defaultTrainingSpecialists) {
    const [record, created] = await AiSpecialist.findOrCreate({
      where: {
        domain: "training",
        specialty: specialist.specialty
      },
      defaults: {
        ...specialist,
        domain: "training",
        isActive: true
      },
      transaction
    });

    if (!created) {
      await record.update(
        {
          ...specialist,
          domain: "training",
          isActive: true
        },
        { transaction }
      );
    }

    specialists[specialist.specialty] = record;
    addSummary(summary, `${created ? "created" : "updated"} ${specialist.name}`, 1);
  }

  return specialists;
}

async function ensureTraineeProfile(trainee, specialist, transaction, summary) {
  const payload = {
    userId: trainee.userId,
    coachId: null,
    aiSpecialistId: specialist.specialistId,
    goal: "strength",
    level: "beginner",
    age: null,
    weight: null,
    height: null,
    biologicalSex: null,
    trainingDaysPerWeek: 3,
    preferredStyle: "general fitness",
    equipmentAccess: ["gym"],
    injuries: [],
    limitations: [],
    likedExercises: [],
    dislikedExercises: [],
    specialtyPreferences: { primary: "strength training" },
    freeTextNotes: "Final production demo profile using admin-managed AI specialists."
  };
  const existingProfile = await TraineeProfile.findOne({
    where: { userId: trainee.userId },
    transaction
  });

  if (existingProfile) {
    await existingProfile.update(payload, { transaction });
    addSummary(summary, "updated demo trainee profile", 1);
    return existingProfile;
  }

  await TraineeProfile.create(payload, { transaction });
  addSummary(summary, "created demo trainee profile", 1);
  return null;
}

async function cleanupLegacyCoaches(strengthSpecialist, transaction, summary) {
  const legacyCoaches = await User.unscoped().findAll({
    where: {
      [Op.or]: [
        { userRole: "coach" },
        { username: { [Op.in]: ["maya.cohen", "strength.coach"] } }
      ]
    },
    transaction
  });
  const legacyCoachIds = legacyCoaches.map((user) => user.userId);
  const legacySpecialistNames = legacyCoaches.map(
    (user) => `${user.firstName} ${user.lastName} AI Coach`
  );

  if (legacyCoachIds.length === 0) {
    addSummary(summary, "legacy coach users found", 0);
    return;
  }

  const legacyPlans = await WorkoutPlan.findAll({
    where: { userId: { [Op.in]: legacyCoachIds } },
    attributes: ["planId"],
    raw: true,
    transaction
  });
  const legacyPlanIds = legacyPlans.map((plan) => plan.planId);
  const planFilter =
    legacyPlanIds.length > 0
      ? { workoutPlanId: { [Op.in]: legacyPlanIds } }
      : { workoutPlanId: { [Op.eq]: null } };

  addSummary(
    summary,
    "cleared trainee profile coach references",
    changedCount(
      await TraineeProfile.update(
        { coachId: null },
        { where: { coachId: { [Op.in]: legacyCoachIds } }, transaction }
      )
    )
  );
  addSummary(
    summary,
    "cleared user coach references",
    changedCount(
      await User.update(
        { coachId: null },
        { where: { coachId: { [Op.in]: legacyCoachIds } }, transaction }
      )
    )
  );

  const issueWhere =
    legacyPlanIds.length > 0
      ? {
          [Op.or]: [
            { userId: { [Op.in]: legacyCoachIds } },
            { workoutPlanId: { [Op.in]: legacyPlanIds } }
          ]
        }
      : { userId: { [Op.in]: legacyCoachIds } };
  const workoutWhere =
    legacyPlanIds.length > 0
      ? {
          [Op.or]: [
            { userId: { [Op.in]: legacyCoachIds } },
            { workoutPlanId: { [Op.in]: legacyPlanIds } }
          ]
        }
      : { userId: { [Op.in]: legacyCoachIds } };

  addSummary(summary, "deleted legacy coach workout issues", await WorkoutIssue.destroy({ where: issueWhere, transaction }));
  addSummary(summary, "deleted legacy coach set logs", await SetLog.destroy({ where: workoutWhere, transaction }));
  addSummary(summary, "deleted legacy coach workout sessions", await WorkoutSession.destroy({ where: workoutWhere, transaction }));
  addSummary(summary, "deleted legacy coach workout assignments", await WorkoutPlanExercise.destroy({ where: planFilter, transaction }));
  addSummary(summary, "deleted legacy coach workout plans", await WorkoutPlan.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));
  addSummary(summary, "deleted legacy coach nutrition log items", await NutritionLogItem.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));
  addSummary(summary, "deleted legacy coach nutrition favorites", await NutritionFavorite.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));
  addSummary(summary, "deleted legacy coach product evaluations", await ProductEvaluation.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));
  addSummary(summary, "deleted legacy coach meal plans", await MealPlan.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));
  addSummary(summary, "deleted legacy coach nutrition profiles", await NutritionProfile.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));

  if (legacySpecialistNames.length > 0) {
    const legacySpecialists = await AiSpecialist.findAll({
      where: {
        domain: "training",
        name: { [Op.in]: legacySpecialistNames }
      },
      transaction
    });
    const legacySpecialistIds = legacySpecialists.map((specialist) => specialist.specialistId);

    if (legacySpecialistIds.length > 0) {
      addSummary(
        summary,
        "moved profiles off legacy human-named AI specialists",
        changedCount(
          await TraineeProfile.update(
            { aiSpecialistId: strengthSpecialist.specialistId },
            { where: { aiSpecialistId: { [Op.in]: legacySpecialistIds } }, transaction }
          )
        )
      );
      addSummary(
        summary,
        "deleted legacy human-named AI specialists",
        await AiSpecialist.destroy({
          where: { specialistId: { [Op.in]: legacySpecialistIds } },
          transaction
        })
      );
    }
  }

  addSummary(summary, "deleted legacy coach users", await User.destroy({ where: { userId: { [Op.in]: legacyCoachIds } }, transaction }));
}

async function printFinalUsers(transaction) {
  const users = await User.unscoped().findAll({
    attributes: ["userId", "username", "userRole"],
    order: [["userId", "ASC"]],
    raw: true,
    transaction
  });

  console.log("");
  console.log("Resulting users:");
  users.forEach((user) => {
    console.log(`- #${user.userId} ${user.username} (${user.userRole})`);
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has("--help") || args.has("-h")) {
    printUsage();
    return;
  }

  const shouldApply = args.has(APPLY_ARGUMENT);
  if (shouldApply && !args.has(CONFIRM_ARGUMENT)) {
    printUsage();
    throw new Error(`Apply mode requires ${CONFIRM_ARGUMENT}.`);
  }

  await sequelize.authenticate();
  const transaction = await sequelize.transaction();
  const summary = [];

  try {
    const admin = await ensureUser(finalAdmin, ["ido.assaf"], transaction, summary);
    const trainee = await ensureUser(finalTrainee, ["daniel.levi"], transaction, summary);
    const specialists = await ensureTrainingSpecialists(transaction, summary);

    await cleanupLegacyCoaches(specialists["strength training"], transaction, summary);
    await ensureTraineeProfile(trainee, specialists["strength training"], transaction, summary);

    if (admin.userRole !== "admin" || trainee.userRole !== "trainee") {
      throw new Error("Final admin/trainee roles were not established.");
    }

    await printFinalUsers(transaction);

    console.log("");
    console.log(shouldApply ? "Applied changes:" : "Dry run only - rolling back changes:");
    summary.forEach((item) => {
      console.log(`- ${item.label}: ${item.count}`);
    });

    if (shouldApply) {
      await transaction.commit();
      console.log("");
      console.log("Final demo seed cleanup committed.");
    } else {
      await transaction.rollback();
      console.log("");
      console.log("No changes were saved. Re-run with --apply --confirm=final-demo to commit.");
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error(`Final demo seed cleanup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
