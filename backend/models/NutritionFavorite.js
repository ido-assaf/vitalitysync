const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NutritionFavorite = sequelize.define(
  "NutritionFavorite",
  {
    nutritionFavoriteId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    servingGrams: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    nutritionPer100g: {
      type: DataTypes.JSON,
      allowNull: false
    },
    nutritionComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "open_food_facts"
    }
  },
  {
    timestamps: true,
    createdAt: "createDate",
    updatedAt: "updateDate",
    indexes: [
      {
        name: "nutrition_favorite_user_barcode",
        unique: true,
        fields: ["userId", "barcode"]
      }
    ]
  }
);

module.exports = NutritionFavorite;
