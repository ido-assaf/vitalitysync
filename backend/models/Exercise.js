const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Exercise = sequelize.define(
  "Exercise",
  {
    exerciseId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    muscleGroup: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mainMuscleGroup: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subMuscleGroup: {
      type: DataTypes.STRING,
      allowNull: true
    },
    equipment: {
      type: DataTypes.STRING,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.STRING,
      allowNull: false
    },
    level: {
      type: DataTypes.STRING,
      allowNull: true
    },
    movementPattern: {
      type: DataTypes.STRING,
      allowNull: true
    },
    goalTags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    instructions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gifUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true
    },
    license: {
      type: DataTypes.STRING,
      allowNull: true
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

module.exports = Exercise;
