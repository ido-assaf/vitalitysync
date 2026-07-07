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
} = require("./mockData");
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
  return {
    ...user,
    email: user.email || `${user.firstName}.${user.lastName}@example.com`.toLowerCase(),
    password: user.password || "password123",
    username: user.username || `${user.firstName}.${user.lastName}`.toLowerCase(),
    theme: user.theme || "system",
    userRole: user.userRole || "trainee",
    coachId: null,
    coachSpecialty: null,
    coachBio: null
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
    coachId: null,
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
