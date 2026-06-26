const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FoodProduct = sequelize.define(
  "FoodProduct",
  {
    productId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false
    },
    calories: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    protein: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    carbs: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    sugar: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    fat: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    allergens: {
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

module.exports = FoodProduct;
