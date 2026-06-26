const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NutritionLogItem = sequelize.define(
  "NutritionLogItem",
  {
    nutritionLogItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    consumedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    foodName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "open_food_facts"
    },
    externalFoodId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    servingGrams: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    portionDescription: {
      type: DataTypes.STRING,
      allowNull: true
    },
    originalDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimateConfidence: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estimateAssumptions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    calories: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    protein: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    carbs: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    fat: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    sugar: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    allergens: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    evaluationStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    evaluationReason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    practicalSuggestion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    guidanceSource: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate",
    indexes: [
      {
        name: "nutrition_log_user_date",
        fields: ["userId", "consumedDate"]
      }
    ]
  }
);

module.exports = NutritionLogItem;
