const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MealPlan = sequelize.define(
  "MealPlan",
  {
    mealPlanId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nutritionProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    planType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dailyCalories: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    proteinGrams: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    meals: {
      type: DataTypes.JSON,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = MealPlan;
