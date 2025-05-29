// backend-node/models/solarPanel.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
    const SolarPanel = sequelize.define('SolarPanel', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        modelName: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        manufacturer: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        peakPowerWatts: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        efficiencyPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
        },
        costPerWatt: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: false,
        },
        warrantyYears: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: 'solar_panels', // Matches your SQL schema
    });

    return SolarPanel;
};