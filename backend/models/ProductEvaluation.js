const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductEvaluation = sequelize.define(
  "ProductEvaluation",
  {
    evaluationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nutritionProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    recommendation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    suggestedAlternatives: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = ProductEvaluation;
