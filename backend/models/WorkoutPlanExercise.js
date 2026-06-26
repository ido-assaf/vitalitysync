const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WorkoutPlanExercise = sequelize.define(
  "WorkoutPlanExercise",
  {
    workoutPlanExerciseId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    workoutPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    exerciseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dayLabel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Day 1"
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    targetSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    targetReps: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "8-12"
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate",
    indexes: [
      {
        unique: true,
        fields: ["workoutPlanId", "exerciseId", "dayLabel"]
      }
    ]
  }
);

module.exports = WorkoutPlanExercise;
