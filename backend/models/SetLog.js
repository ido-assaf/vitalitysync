const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SetLog = sequelize.define(
  "SetLog",
  {
    setLogId: {
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
    exerciseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    workoutSessionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    setNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    logDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = SetLog;
