const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WorkoutIssue = sequelize.define(
  "WorkoutIssue",
  {
    issueId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    workoutSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    workoutPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    severity: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "medium"
    },
    signals: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = WorkoutIssue;
