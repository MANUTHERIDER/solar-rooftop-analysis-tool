// backend-node/models/index.js
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import your models here
db.User = require('./user')(sequelize, Sequelize);
db.RooftopAssessment = require('./rooftopAssessment')(sequelize, Sequelize);
db.SolarPanel = require('./solarPanel')(sequelize, Sequelize);
db.Incentive = require('./incentive')(sequelize, Sequelize);

// Define associations (e.g., User has many RooftopAssessments)
db.User.hasMany(db.RooftopAssessment, { foreignKey: 'userId' });
db.RooftopAssessment.belongsTo(db.User, { foreignKey: 'userId' });


// Add other associations as needed, e.g.:
// db.RooftopAssessment.belongsTo(db.SolarPanel, { foreignKey: 'recommendedPanelId' });

module.exports = db;