const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TraineeProfile = sequelize.define(
  "TraineeProfile",
  {
    profileId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    aiSpecialistId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    goal: {
      type: DataTypes.STRING,
      allowNull: false
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    height: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    biologicalSex: {
      type: DataTypes.STRING,
      allowNull: true
    },
    trainingDaysPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    preferredStyle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    equipmentAccess: {
      type: DataTypes.JSON,
      allowNull: false
    },
    injuries: {
      type: DataTypes.JSON,
      allowNull: false
    },
    limitations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    likedExercises: {
      type: DataTypes.JSON,
      allowNull: false
    },
    dislikedExercises: {
      type: DataTypes.JSON,
      allowNull: false
    },
    specialtyPreferences: {
      type: DataTypes.JSON,
      allowNull: false
    },
    freeTextNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = TraineeProfile;
