const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WorkoutPlan = sequelize.define(
  "WorkoutPlan",
  {
    planId: {
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
    level: {
      type: DataTypes.STRING,
      allowNull: false
    },
    daysPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
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

module.exports = WorkoutPlan;
