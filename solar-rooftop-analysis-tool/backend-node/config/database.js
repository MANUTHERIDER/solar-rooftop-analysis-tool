// backend-node/config/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false, // Set to true to see SQL queries in console
        define: {
            timestamps: true, // Adds createdAt and updatedAt fields automatically
            underscored: true // Uses snake_case for column names
        }
    }
);

async function connectToDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1); // Exit if DB connection fails
    }
}

module.exports = { sequelize, connectToDatabase };