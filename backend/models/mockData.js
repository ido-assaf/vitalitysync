const users = [
  {
    userId: 1,
    firstName: "Student",
    lastName: "Admin",
    email: "student@example.com",
    password: "123456",
    username: "student.admin",
    createDate: "2026-04-16T09:00:00.000Z",
    updateDate: "2026-04-16T09:00:00.000Z",
    userRole: "admin"
  },
  {
    userId: 2,
    firstName: "Demo",
    lastName: "Trainee",
    email: "demo.trainee@example.com",
    password: "password123",
    username: "demo.trainee",
    createDate: "2026-04-16T09:10:00.000Z",
    updateDate: "2026-04-16T09:10:00.000Z",
    userRole: "trainee"
  }
];

const workoutPlans = [
  {
    planId: 1,
    userId: 2,
    goal: "strength",
    level: "beginner",
    daysPerWeek: 3,
    durationMinutes: 60,
    notes: "[ONBOARDING_SUGGESTED_PLAN] AI coach specialty: strength training. Equipment: gym. Limitations: none. Injuries: none. Disliked exercises: none.",
    createDate: "2026-04-16T10:00:00.000Z",
    updateDate: "2026-04-16T10:00:00.000Z"
  }
];

const exercises = [
  {
    exerciseId: 1,
    name: "Bench Press",
    muscleGroup: "Chest",
    equipment: "Barbell",
    difficulty: "intermediate",
    notes: "Main chest compound exercise.",
    createDate: "2026-04-16T11:00:00.000Z",
    updateDate: "2026-04-16T11:00:00.000Z"
  },
  {
    exerciseId: 2,
    name: "Lat Pulldown",
    muscleGroup: "Back",
    equipment: "Cable machine",
    difficulty: "beginner",
    notes: "Vertical pulling movement focused on the lats.",
    createDate: "2026-04-16T11:10:00.000Z",
    updateDate: "2026-04-16T11:10:00.000Z"
  },
  {
    exerciseId: 3,
    name: "Goblet Squat",
    muscleGroup: "Legs",
    equipment: "Dumbbell",
    difficulty: "beginner",
    notes: "Squat pattern with a controlled torso position.",
    createDate: "2026-04-16T11:20:00.000Z",
    updateDate: "2026-04-16T11:20:00.000Z"
  }
];

const setLogs = [
  {
    setLogId: 1,
    userId: 2,
    workoutPlanId: 1,
    exerciseId: 1,
    setNumber: 1,
    weight: 60,
    reps: 10,
    completed: true,
    logDate: "2026-04-17T08:00:00.000Z",
    createDate: "2026-04-17T08:00:00.000Z",
    updateDate: "2026-04-17T08:00:00.000Z"
  },
  {
    setLogId: 2,
    userId: 2,
    workoutPlanId: 1,
    exerciseId: 1,
    setNumber: 2,
    weight: 62.5,
    reps: 8,
    completed: true,
    logDate: "2026-04-17T08:05:00.000Z",
    createDate: "2026-04-17T08:05:00.000Z",
    updateDate: "2026-04-17T08:05:00.000Z"
  }
];

const nutritionProfiles = [
  {
    nutritionProfileId: 1,
    userId: 2,
    goal: "muscle gain",
    medicalRestrictions: [],
    dietaryPreferences: ["high protein", "balanced carbs"],
    freeTextNeeds: "I need enough food to support three strength training days.",
    structuredProfile: "Muscle gain profile with high protein and balanced carbohydrates",
    createDate: "2026-04-18T08:00:00.000Z",
    updateDate: "2026-04-18T08:00:00.000Z"
  }
];

const mealPlans = [
  {
    mealPlanId: 1,
    userId: 2,
    nutritionProfileId: 1,
    planType: "daily",
    dailyCalories: 2800,
    proteinGrams: 190,
    meals: ["Breakfast: eggs and oats", "Lunch: chicken rice bowl", "Dinner: salmon potatoes"],
    notes: "Higher calorie plan for muscle gain",
    createDate: "2026-04-18T09:00:00.000Z",
    updateDate: "2026-04-18T09:00:00.000Z"
  }
];

const foodProducts = [
  {
    productId: 1,
    barcode: "729000000001",
    name: "Protein Yogurt",
    brand: "Example Brand",
    calories: 120,
    protein: 20,
    carbs: 8,
    sugar: 4,
    fat: 2,
    allergens: ["milk"],
    createDate: "2026-04-18T10:00:00.000Z",
    updateDate: "2026-04-18T10:00:00.000Z"
  },
  {
    productId: 2,
    barcode: "729000000002",
    name: "Oat Protein Bar",
    brand: "Fit Snack",
    calories: 210,
    protein: 18,
    carbs: 24,
    sugar: 6,
    fat: 7,
    allergens: ["gluten", "nuts"],
    createDate: "2026-04-18T10:15:00.000Z",
    updateDate: "2026-04-18T10:15:00.000Z"
  },
  {
    productId: 3,
    barcode: "729000000003",
    name: "Low Sugar Granola",
    brand: "Morning Fuel",
    calories: 180,
    protein: 6,
    carbs: 28,
    sugar: 3,
    fat: 5,
    allergens: ["gluten"],
    createDate: "2026-04-18T10:30:00.000Z",
    updateDate: "2026-04-18T10:30:00.000Z"
  }
];

const productEvaluations = [
  {
    evaluationId: 1,
    userId: 2,
    productId: 1,
    nutritionProfileId: 1,
    score: 82,
    recommendation: "Suitable",
    explanation: "Good protein amount and low sugar compared to similar products.",
    suggestedAlternatives: ["Low sugar protein yogurt", "Greek yogurt 0%"],
    createDate: "2026-04-18T11:00:00.000Z",
    updateDate: "2026-04-18T11:00:00.000Z"
  }
];

const aiSpecialists = [
  {
    specialistId: 1,
    name: "Strength Training AI Coach",
    domain: "training",
    specialty: "strength training",
    description: "Helps users build strength plans around compound lifts and recovery.",
    rules: ["prioritize progressive overload", "respect injuries", "manage recovery"],
    createDate: "2026-04-18T12:00:00.000Z",
    updateDate: "2026-04-18T12:00:00.000Z"
  },
  {
    specialistId: 2,
    name: "Running AI Coach",
    domain: "training",
    specialty: "running",
    description: "Helps users plan running workouts and weekly mileage progression.",
    rules: ["increase volume gradually", "include easy runs", "watch fatigue"],
    createDate: "2026-04-18T12:15:00.000Z",
    updateDate: "2026-04-18T12:15:00.000Z"
  },
  {
    specialistId: 3,
    name: "Sports Nutrition AI",
    domain: "nutrition",
    specialty: "sports nutrition",
    description: "Helps users build nutrition plans for training performance and recovery.",
    rules: ["prioritize protein", "support recovery", "avoid unnecessary sugar"],
    createDate: "2026-04-18T12:30:00.000Z",
    updateDate: "2026-04-18T12:30:00.000Z"
  },
  {
    specialistId: 4,
    name: "Diabetic Nutrition AI",
    domain: "nutrition",
    specialty: "diabetic nutrition",
    description: "Helps users choose meals and products with steadier blood sugar impact.",
    rules: ["limit added sugar", "prefer high fiber foods", "support balanced meals"],
    createDate: "2026-04-18T12:45:00.000Z",
    updateDate: "2026-04-18T12:45:00.000Z"
  }
];

const counters = {
  userId: 3,
  planId: 2,
  exerciseId: 4,
  setLogId: 3,
  nutritionProfileId: 2,
  mealPlanId: 2,
  productId: 4,
  evaluationId: 2,
  specialistId: 5
};

module.exports = {
  users,
  workoutPlans,
  exercises,
  setLogs,
  nutritionProfiles,
  mealPlans,
  foodProducts,
  productEvaluations,
  aiSpecialists,
  counters
};
