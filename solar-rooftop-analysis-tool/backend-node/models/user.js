// backend-node/models/user.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
            },
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        passwordHash: { // Store hashed passwords, NEVER plain text
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        tableName: 'users', // Matches your SQL schema
        // underscored: true is set globally in config/database.js
    });

    return User;
};