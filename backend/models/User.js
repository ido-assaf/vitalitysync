const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    theme: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "system"
    },
    userRole: {
      type: DataTypes.STRING,
      allowNull: false
    },
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    coachSpecialty: {
      type: DataTypes.STRING,
      allowNull: true
    },
    coachBio: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    defaultScope: {
      attributes: {
        exclude: ["password"]
      }
    },
    scopes: {
      withPassword: {
        attributes: {}
      }
    },
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate"
  }
);

module.exports = User;
