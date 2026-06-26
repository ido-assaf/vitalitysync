const {
  aiSpecialists,
  exercises,
  foodProducts,
  mealPlans,
  nutritionProfiles,
  productEvaluations,
  setLogs,
  users,
  workoutPlans
} = require("../models/mockData");
const {
  AiSpecialist,
  Exercise,
  FoodProduct,
  MealPlan,
  NutritionProfile,
  ProductEvaluation,
  SetLog,
  TraineeProfile,
  User,
  WorkoutPlan,
  WorkoutPlanExercise
} = require("../models");
const { seedCuratedExercises } = require("./curatedExercises");

function withUserDefaults(user) {
  const email =
    user.userId === 1
      ? "student@example.com"
      : `${user.firstName}.${user.lastName}@example.com`.toLowerCase();
  const roleById = {
    1: "admin",
    2: "coach",
    3: "trainee"
  };

  return {
    ...user,
    email,
    password: user.userId === 1 ? "123456" : "password123",
    username: `${user.firstName}.${user.lastName}`.toLowerCase(),
    theme: "system",
    userRole: roleById[user.userId] || "trainee",
    coachId: user.userId === 3 ? 2 : null,
    coachSpecialty: user.userId === 2 ? "strength training" : null,
    coachBio:
      user.userId === 2
        ? "Strength and conditioning coach focused on safe progressive overload."
        : null
  };
}

async function ensureDemoTraineeProfile() {
  const demoTrainee = await User.findOne({
    where: {
      username: "demo.trainee",
      userRole: "trainee"
    }
  });

  if (!demoTrainee) {
    return;
  }

  const existingProfile = await TraineeProfile.findOne({
    where: { userId: demoTrainee.userId }
  });

  if (existingProfile) {
    return;
  }

  const strengthSpecialist = await AiSpecialist.findOne({
    where: {
      domain: "training",
      specialty: "strength training",
      isActive: true
    },
    order: [["specialistId", "ASC"]]
  });

  await TraineeProfile.create({
    userId: demoTrainee.userId,
    coachId: demoTrainee.coachId || null,
    aiSpecialistId: strengthSpecialist?.specialistId || null,
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
    freeTextNotes: "Non-destructive Assignment 4 demo profile."
  });
}

async function seedDatabase() {
  const existingUsers = await User.count();

  if (existingUsers === 0) {
    await User.bulkCreate(users.map(withUserDefaults));
    await Exercise.bulkCreate(exercises);
    await WorkoutPlan.bulkCreate(workoutPlans);

    await WorkoutPlanExercise.bulkCreate([
      {
        workoutPlanId: 1,
        exerciseId: 1,
        dayLabel: "Day 1",
        orderIndex: 1,
        targetSets: 3,
        targetReps: "8-10"
      },
      {
        workoutPlanId: 1,
        exerciseId: 2,
        dayLabel: "Day 2",
        orderIndex: 1,
        targetSets: 3,
        targetReps: "10-12"
      },
      {
        workoutPlanId: 2,
        exerciseId: 2,
        dayLabel: "Day 1",
        orderIndex: 1,
        targetSets: 4,
        targetReps: "12-15"
      },
      {
        workoutPlanId: 3,
        exerciseId: 3,
        dayLabel: "Day 1",
        orderIndex: 1,
        targetSets: 4,
        targetReps: "6-8"
      }
    ]);

    await SetLog.bulkCreate(setLogs);
    await NutritionProfile.bulkCreate(nutritionProfiles);
    await MealPlan.bulkCreate(mealPlans);
    await FoodProduct.bulkCreate(foodProducts);
    await ProductEvaluation.bulkCreate(productEvaluations);
    await AiSpecialist.bulkCreate(aiSpecialists);
  }

  await ensureDemoTraineeProfile();
  await seedCuratedExercises();
}

module.exports = {
  seedDatabase
};
