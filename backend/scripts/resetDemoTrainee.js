const path = require("path");
const { Op } = require("sequelize");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true
});

const {
  MealPlan,
  NutritionLogItem,
  NutritionProfile,
  ProductEvaluation,
  SetLog,
  User,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession,
  sequelize
} = require("../models");

const DEMO_USERNAME = "demo.trainee";
const CONFIRM_ARGUMENT = `--confirm=${DEMO_USERNAME}`;

function printUsage() {
  console.log("Reset only the stored workout and nutrition demo data for demo.trainee.");
  console.log("");
  console.log("Preview:");
  console.log("  node scripts/resetDemoTrainee.js --dry-run");
  console.log("");
  console.log("Apply:");
  console.log(`  node scripts/resetDemoTrainee.js ${CONFIRM_ARGUMENT}`);
}

function printSummary(title, user, counts) {
  console.log("");
  console.log(title);
  console.log(`User preserved: ${user.username} (userId ${user.userId})`);
  console.log(`Workout issues: ${counts.workoutIssues}`);
  console.log(`Set logs: ${counts.setLogs}`);
  console.log(`Workout sessions: ${counts.workoutSessions}`);
  console.log(`Workout plan exercises: ${counts.workoutPlanExercises}`);
  console.log(`Workout plans: ${counts.workoutPlans}`);
  console.log(`Nutrition log items: ${counts.nutritionLogItems}`);
  console.log(`Meal plans linked to nutrition profile: ${counts.mealPlans}`);
  console.log(`Product evaluations linked to nutrition profile: ${counts.productEvaluations}`);
  console.log(`Nutrition profiles: ${counts.nutritionProfiles}`);
  console.log("");
  console.log("Preserved: demo trainee user, fitness profile, AI specialist assignment,");
  console.log("nutrition favorites, exercise catalog, other users, global seed data, and schema.");
}

async function findDemoUser() {
  const users = await User.unscoped().findAll({
    where: { username: DEMO_USERNAME },
    attributes: ["userId", "username", "userRole"],
    raw: true
  });

  if (users.length !== 1) {
    throw new Error(
      `Expected exactly one user named ${DEMO_USERNAME}, but found ${users.length}. Nothing was changed.`
    );
  }

  const user = users[0];
  if (user.userRole !== "trainee") {
    throw new Error(
      `${DEMO_USERNAME} has role "${user.userRole}", not "trainee". Nothing was changed.`
    );
  }

  return user;
}

async function getResetScope(userId, transaction) {
  const plans = await WorkoutPlan.findAll({
    where: { userId },
    attributes: ["planId"],
    transaction,
    raw: true
  });
  const planIds = plans.map((plan) => plan.planId);
  const planExerciseWhere = planIds.length
    ? { workoutPlanId: { [Op.in]: planIds } }
    : { workoutPlanId: { [Op.eq]: null } };

  return {
    planIds,
    planExerciseWhere,
    counts: {
      workoutIssues: await WorkoutIssue.count({ where: { userId }, transaction }),
      setLogs: await SetLog.count({ where: { userId }, transaction }),
      workoutSessions: await WorkoutSession.count({ where: { userId }, transaction }),
      workoutPlanExercises: await WorkoutPlanExercise.count({
        where: planExerciseWhere,
        transaction
      }),
      workoutPlans: planIds.length,
      nutritionLogItems: await NutritionLogItem.count({ where: { userId }, transaction }),
      mealPlans: await MealPlan.count({ where: { userId }, transaction }),
      productEvaluations: await ProductEvaluation.count({ where: { userId }, transaction }),
      nutritionProfiles: await NutritionProfile.count({ where: { userId }, transaction })
    }
  };
}

async function resetDemoTrainee(user) {
  return sequelize.transaction(async (transaction) => {
    const scope = await getResetScope(user.userId, transaction);

    const deleted = {
      workoutIssues: await WorkoutIssue.destroy({
        where: { userId: user.userId },
        transaction
      }),
      setLogs: await SetLog.destroy({
        where: { userId: user.userId },
        transaction
      }),
      workoutSessions: await WorkoutSession.destroy({
        where: { userId: user.userId },
        transaction
      }),
      workoutPlanExercises: await WorkoutPlanExercise.destroy({
        where: scope.planExerciseWhere,
        transaction
      }),
      workoutPlans: await WorkoutPlan.destroy({
        where: { userId: user.userId },
        transaction
      }),
      nutritionLogItems: await NutritionLogItem.destroy({
        where: { userId: user.userId },
        transaction
      }),
      mealPlans: await MealPlan.destroy({
        where: { userId: user.userId },
        transaction
      }),
      productEvaluations: await ProductEvaluation.destroy({
        where: { userId: user.userId },
        transaction
      }),
      nutritionProfiles: await NutritionProfile.destroy({
        where: { userId: user.userId },
        transaction
      })
    };

    return deleted;
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has("--help") || args.has("-h")) {
    printUsage();
    return;
  }

  const dryRun = args.has("--dry-run");
  if (!dryRun && !args.has(CONFIRM_ARGUMENT)) {
    printUsage();
    throw new Error(
      `Confirmation is required. Re-run with ${CONFIRM_ARGUMENT}, or use --dry-run to preview.`
    );
  }

  await sequelize.authenticate();
  const user = await findDemoUser();

  if (dryRun) {
    const scope = await getResetScope(user.userId);
    printSummary("Dry run only - nothing was deleted.", user, scope.counts);
    return;
  }

  const deleted = await resetDemoTrainee(user);
  printSummary("Demo trainee reset completed successfully.", user, deleted);
}

main()
  .catch((error) => {
    console.error("");
    console.error(`Reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
