const sequelize = require("../config/database");
const Admin = require("./Admin");
const AiSpecialist = require("./AiSpecialist");
const AiSpecialistSignalPattern = require("./AiSpecialistSignalPattern");
const Exercise = require("./Exercise");
const FoodProduct = require("./FoodProduct");
const MealPlan = require("./MealPlan");
const NutritionLogItem = require("./NutritionLogItem");
const NutritionFavorite = require("./NutritionFavorite");
const NutritionProfile = require("./NutritionProfile");
const ProductEvaluation = require("./ProductEvaluation");
const SetLog = require("./SetLog");
const TraineeProfile = require("./TraineeProfile");
const User = require("./User");
const WorkoutIssue = require("./WorkoutIssue");
const WorkoutPlan = require("./WorkoutPlan");
const WorkoutPlanExercise = require("./WorkoutPlanExercise");
const WorkoutSession = require("./WorkoutSession");

User.hasMany(User, {
  as: "Trainees",
  foreignKey: "coachId",
  onDelete: "SET NULL"
});
User.belongsTo(User, {
  as: "Coach",
  foreignKey: "coachId",
  onDelete: "SET NULL"
});

User.hasOne(Admin, { foreignKey: "userId" });
Admin.belongsTo(User, { foreignKey: "userId" });

User.hasMany(WorkoutPlan, { foreignKey: "userId" });
WorkoutPlan.belongsTo(User, { foreignKey: "userId" });

User.hasOne(TraineeProfile, { foreignKey: "userId" });
TraineeProfile.belongsTo(User, { foreignKey: "userId" });
AiSpecialist.hasMany(TraineeProfile, { foreignKey: "aiSpecialistId" });
TraineeProfile.belongsTo(AiSpecialist, { foreignKey: "aiSpecialistId" });

User.hasMany(SetLog, { foreignKey: "userId" });
SetLog.belongsTo(User, { foreignKey: "userId" });

WorkoutPlan.hasMany(SetLog, { foreignKey: "workoutPlanId" });
SetLog.belongsTo(WorkoutPlan, { foreignKey: "workoutPlanId" });

Exercise.hasMany(SetLog, { foreignKey: "exerciseId" });
SetLog.belongsTo(Exercise, { foreignKey: "exerciseId" });

WorkoutSession.hasMany(SetLog, { foreignKey: "workoutSessionId" });
SetLog.belongsTo(WorkoutSession, { foreignKey: "workoutSessionId" });

User.hasMany(NutritionProfile, { foreignKey: "userId" });
NutritionProfile.belongsTo(User, { foreignKey: "userId" });

User.hasMany(NutritionLogItem, { foreignKey: "userId" });
NutritionLogItem.belongsTo(User, { foreignKey: "userId" });
User.hasMany(NutritionFavorite, { foreignKey: "userId" });
NutritionFavorite.belongsTo(User, { foreignKey: "userId" });

User.hasMany(MealPlan, { foreignKey: "userId" });
MealPlan.belongsTo(User, { foreignKey: "userId" });

NutritionProfile.hasMany(MealPlan, { foreignKey: "nutritionProfileId" });
MealPlan.belongsTo(NutritionProfile, { foreignKey: "nutritionProfileId" });

User.hasMany(ProductEvaluation, { foreignKey: "userId" });
ProductEvaluation.belongsTo(User, { foreignKey: "userId" });

FoodProduct.hasMany(ProductEvaluation, { foreignKey: "productId" });
ProductEvaluation.belongsTo(FoodProduct, { foreignKey: "productId" });

NutritionProfile.hasMany(ProductEvaluation, { foreignKey: "nutritionProfileId" });
ProductEvaluation.belongsTo(NutritionProfile, { foreignKey: "nutritionProfileId" });

WorkoutPlan.belongsToMany(Exercise, {
  through: WorkoutPlanExercise,
  foreignKey: "workoutPlanId",
  otherKey: "exerciseId"
});
Exercise.belongsToMany(WorkoutPlan, {
  through: WorkoutPlanExercise,
  foreignKey: "exerciseId",
  otherKey: "workoutPlanId"
});
WorkoutPlan.hasMany(WorkoutPlanExercise, { foreignKey: "workoutPlanId" });
WorkoutPlanExercise.belongsTo(WorkoutPlan, { foreignKey: "workoutPlanId" });
Exercise.hasMany(WorkoutPlanExercise, { foreignKey: "exerciseId" });
WorkoutPlanExercise.belongsTo(Exercise, { foreignKey: "exerciseId" });

User.hasMany(WorkoutSession, { foreignKey: "userId" });
WorkoutSession.belongsTo(User, { foreignKey: "userId" });
WorkoutPlan.hasMany(WorkoutSession, { foreignKey: "workoutPlanId" });
WorkoutSession.belongsTo(WorkoutPlan, { foreignKey: "workoutPlanId" });

WorkoutSession.hasMany(WorkoutIssue, { foreignKey: "workoutSessionId" });
WorkoutIssue.belongsTo(WorkoutSession, { foreignKey: "workoutSessionId" });
User.hasMany(WorkoutIssue, { foreignKey: "userId" });
WorkoutIssue.belongsTo(User, { foreignKey: "userId" });
WorkoutPlan.hasMany(WorkoutIssue, { foreignKey: "workoutPlanId" });
WorkoutIssue.belongsTo(WorkoutPlan, { foreignKey: "workoutPlanId" });

module.exports = {
  sequelize,
  Admin,
  AiSpecialist,
  AiSpecialistSignalPattern,
  Exercise,
  FoodProduct,
  MealPlan,
  NutritionLogItem,
  NutritionFavorite,
  NutritionProfile,
  ProductEvaluation,
  SetLog,
  TraineeProfile,
  User,
  WorkoutIssue,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutSession
};
