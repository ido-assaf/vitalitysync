const users = [
  {
    userId: 1,
    firstName: "Ido",
    lastName: "Assaf",
    createDate: "2026-04-16T09:00:00.000Z",
    updateDate: "2026-04-16T09:00:00.000Z",
    userRole: "admin"
  },
  {
    userId: 2,
    firstName: "Maya",
    lastName: "Cohen",
    createDate: "2026-04-16T09:10:00.000Z",
    updateDate: "2026-04-16T09:10:00.000Z",
    userRole: "manager"
  },
  {
    userId: 3,
    firstName: "Daniel",
    lastName: "Levi",
    createDate: "2026-04-16T09:20:00.000Z",
    updateDate: "2026-04-16T09:20:00.000Z",
    userRole: "user"
  }
];

const workoutPlans = [
  {
    planId: 1,
    userId: 1,
    goal: "muscle gain",
    level: "beginner",
    daysPerWeek: 4,
    durationMinutes: 60,
    notes: "Full body strength plan with extra upper chest focus.",
    createDate: "2026-04-16T10:00:00.000Z",
    updateDate: "2026-04-16T10:00:00.000Z"
  },
  {
    planId: 2,
    userId: 2,
    goal: "fat loss",
    level: "intermediate",
    daysPerWeek: 5,
    durationMinutes: 45,
    notes: "Higher weekly frequency with controlled recovery and low-impact conditioning.",
    createDate: "2026-04-16T10:15:00.000Z",
    updateDate: "2026-04-16T10:15:00.000Z"
  },
  {
    planId: 3,
    userId: 3,
    goal: "strength",
    level: "advanced",
    daysPerWeek: 4,
    durationMinutes: 75,
    notes: "Upper/lower weekly plan with heavier compounds and longer rest periods.",
    createDate: "2026-04-16T10:30:00.000Z",
    updateDate: "2026-04-16T10:30:00.000Z"
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
    userId: 1,
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
    userId: 1,
    workoutPlanId: 1,
    exerciseId: 1,
    setNumber: 2,
    weight: 62.5,
    reps: 8,
    completed: true,
    logDate: "2026-04-17T08:05:00.000Z",
    createDate: "2026-04-17T08:05:00.000Z",
    updateDate: "2026-04-17T08:05:00.000Z"
  },
  {
    setLogId: 3,
    userId: 2,
    workoutPlanId: 2,
    exerciseId: 2,
    setNumber: 1,
    weight: 35,
    reps: 12,
    completed: true,
    logDate: "2026-04-17T09:00:00.000Z",
    createDate: "2026-04-17T09:00:00.000Z",
    updateDate: "2026-04-17T09:00:00.000Z"
  }
];

const nutritionProfiles = [
  {
    nutritionProfileId: 1,
    userId: 1,
    goal: "fat loss",
    medicalRestrictions: ["lactose sensitivity"],
    dietaryPreferences: ["high protein", "low sugar"],
    freeTextNeeds: "I want to lose weight and avoid dairy",
    structuredProfile: "Fat loss profile with high protein, low sugar, and lactose avoidance",
    createDate: "2026-04-18T08:00:00.000Z",
    updateDate: "2026-04-18T08:00:00.000Z"
  },
  {
    nutritionProfileId: 2,
    userId: 2,
    goal: "muscle gain",
    medicalRestrictions: [],
    dietaryPreferences: ["high protein", "balanced carbs"],
    freeTextNeeds: "I need enough food to support five training days",
    structuredProfile: "Muscle gain profile with high protein and balanced carbohydrates",
    createDate: "2026-04-18T08:15:00.000Z",
    updateDate: "2026-04-18T08:15:00.000Z"
  },
  {
    nutritionProfileId: 3,
    userId: 3,
    goal: "blood sugar control",
    medicalRestrictions: ["diabetes"],
    dietaryPreferences: ["low sugar", "high fiber"],
    freeTextNeeds: "I want meals that keep my energy stable",
    structuredProfile: "Blood sugar control profile with low sugar and high fiber meals",
    createDate: "2026-04-18T08:30:00.000Z",
    updateDate: "2026-04-18T08:30:00.000Z"
  }
];

const mealPlans = [
  {
    mealPlanId: 1,
    userId: 1,
    nutritionProfileId: 1,
    planType: "daily",
    dailyCalories: 2200,
    proteinGrams: 160,
    meals: ["Breakfast: eggs and oats", "Lunch: chicken rice bowl", "Dinner: tuna salad"],
    notes: "High protein daily meal plan",
    createDate: "2026-04-18T09:00:00.000Z",
    updateDate: "2026-04-18T09:00:00.000Z"
  },
  {
    mealPlanId: 2,
    userId: 2,
    nutritionProfileId: 2,
    planType: "daily",
    dailyCalories: 2800,
    proteinGrams: 190,
    meals: ["Breakfast: yogurt oats", "Lunch: turkey pasta", "Dinner: salmon potatoes"],
    notes: "Higher calorie plan for muscle gain",
    createDate: "2026-04-18T09:15:00.000Z",
    updateDate: "2026-04-18T09:15:00.000Z"
  },
  {
    mealPlanId: 3,
    userId: 3,
    nutritionProfileId: 3,
    planType: "daily",
    dailyCalories: 2000,
    proteinGrams: 140,
    meals: ["Breakfast: omelet and vegetables", "Lunch: lentil chicken salad", "Dinner: tofu stir fry"],
    notes: "Low sugar plan with steady meals",
    createDate: "2026-04-18T09:30:00.000Z",
    updateDate: "2026-04-18T09:30:00.000Z"
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
    userId: 1,
    productId: 1,
    nutritionProfileId: 1,
    score: 82,
    recommendation: "Suitable",
    explanation: "Good protein amount and low sugar compared to similar products.",
    suggestedAlternatives: ["Low sugar protein yogurt", "Greek yogurt 0%"],
    createDate: "2026-04-18T11:00:00.000Z",
    updateDate: "2026-04-18T11:00:00.000Z"
  },
  {
    evaluationId: 2,
    userId: 2,
    productId: 2,
    nutritionProfileId: 2,
    score: 75,
    recommendation: "Mostly suitable",
    explanation: "Useful protein snack, but calories should fit the daily plan.",
    suggestedAlternatives: ["Homemade oat bar", "Protein shake with banana"],
    createDate: "2026-04-18T11:15:00.000Z",
    updateDate: "2026-04-18T11:15:00.000Z"
  },
  {
    evaluationId: 3,
    userId: 3,
    productId: 3,
    nutritionProfileId: 3,
    score: 68,
    recommendation: "Use carefully",
    explanation: "Sugar is low, but carbs should be portion controlled.",
    suggestedAlternatives: ["Plain oats", "High fiber cereal"],
    createDate: "2026-04-18T11:30:00.000Z",
    updateDate: "2026-04-18T11:30:00.000Z"
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
  userId: 4,
  planId: 4,
  exerciseId: 4,
  setLogId: 4,
  nutritionProfileId: 4,
  mealPlanId: 4,
  productId: 4,
  evaluationId: 4,
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
