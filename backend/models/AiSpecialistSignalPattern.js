const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AiSpecialistSignalPattern = sequelize.define(
  "AiSpecialistSignalPattern",
  {
    patternId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    normalizedPattern: {
      type: DataTypes.STRING(240),
      allowNull: false
    },
    patternHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    language: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "unknown"
    },
    scope: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "weekly_check_in"
    },
    qualityCategory: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    signals: {
      type: DataTypes.JSON,
      allowNull: false
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    confidenceLabel: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "low"
    },
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "llm"
    },
    hitCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastMatchedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: "active"
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = AiSpecialistSignalPattern;
