const { Sequelize } = require("sequelize");

const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "3306",
  DB_NAME = "vitalitysync",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_SSL = "false",
  NODE_ENV = "development"
} = process.env;

const dialectOptions =
  DB_SSL === "true"
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {};

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: "mysql",
  logging: NODE_ENV === "development" && process.env.DB_LOGGING === "true" ? console.log : false,
  dialectOptions,
  define: {
    freezeTableName: true
  }
});

module.exports = sequelize;
