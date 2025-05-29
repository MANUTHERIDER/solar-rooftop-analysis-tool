// backend-node/models/incentive.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
    const Incentive = sequelize.define('Incentive', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        region: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        startDate: {
            type: DataTypes.DATEONLY, // Use DATEONLY for date without time
            allowNull: true,
        },
        endDate: {
            type: DataTypes.DATEONLY, // Use DATEONLY for date without time
            allowNull: true,
        },
    }, {
        tableName: 'incentives', // Matches your SQL schema
    });

    return Incentive;
};