const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NutritionProfile = sequelize.define(
  "NutritionProfile",
  {
    nutritionProfileId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    goal: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dailyCaloriesTarget: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    dailyProteinTarget: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    allergies: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    medicalRestrictions: {
      type: DataTypes.JSON,
      allowNull: false
    },
    dietaryPreferences: {
      type: DataTypes.JSON,
      allowNull: false
    },
    freeTextNeeds: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    structuredProfile: {
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

module.exports = NutritionProfile;
