// backend-node/models/rooftopAssessment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
    const RooftopAssessment = sequelize.define('RooftopAssessment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: { // Foreign key for user
            type: DataTypes.INTEGER,
            allowNull: true, // Can be null if assessment is anonymous
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: false,
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: false,
        },
        inputParams: { // JSONB for flexible input parameters
            type: DataTypes.JSONB,
            allowNull: true,
        },
        aiResults: { // JSONB for AI-generated results
            type: DataTypes.JSONB,
            allowNull: true,
        },
        rawImageAnalysis: { // JSONB for raw Vision AI output
            type: DataTypes.JSONB,
            allowNull: true,
        },
        estimatedKwhPerYear: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        estimatedPaybackYears: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
        systemSizeKw: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
    }, {
        tableName: 'rooftop_assessments', // Matches your SQL schema
    });

    return RooftopAssessment;
};