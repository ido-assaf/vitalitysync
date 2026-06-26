const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WorkoutSession = sequelize.define(
  "WorkoutSession",
  {
    workoutSessionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    workoutPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    selectedDayLabel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active"
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totalSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    completedSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    issueCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = WorkoutSession;
