// backend-node/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Import axios
const { connectToDatabase, sequelize } = require('./config/database');
const db = require('./models'); // Import all models (User, RooftopAssessment, etc.)

const app = express();
const NODE_PORT = process.env.NODE_PORT || 5000;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'; // Base URL for your Python backend

// Enable CORS for all origins during development.
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());

// --- Database Connection and Sync ---
connectToDatabase().then(() => {
    // `alter: true` is for development to update table schema automatically.
    // In production, you'd use migrations (`sequelize db:migrate`).
    return sequelize.sync({ alter: true });
}).then(() => {
    console.log('Database models synchronized successfully.');
    // Start the server ONLY after DB connection and sync
    app.listen(NODE_PORT, () => {
        console.log(`Node.js Backend running on port ${NODE_PORT}`);
        console.log(`Access at http://localhost:${NODE_PORT}`);
    });
}).catch(error => {
    console.error('Failed to synchronize database models or connect:', error);
    process.exit(1); // Exit if sync/connection fails
});

// --- Basic Route ---
app.get('/', (req, res) => {
    res.send('Node.js Backend is running!');
});

// --- Main API Route for Solar Assessment Proxy ---
// This route will receive requests from the frontend,
// forward them to the Python AI engine, and save the results to the DB.
app.post('/api/solar-assessment', async (req, res) => {
    const { address, latitude, longitude, userId } = req.body; // userId will be optional for now

    if (!address || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing address, latitude, or longitude.' });
    }

    console.log(`Node.js received assessment request for: ${address}`);

    try {
        // 1. Call Python AI Engine
        const pythonResponse = await axios.post(`${PYTHON_API_URL}/api/analyze-rooftop`, {
            address,
            latitude,
            longitude
        });

        const aiResults = pythonResponse.data;
        console.log('Received AI results from Python:', aiResults);

        // 2. Prepare data for saving to PostgreSQL
        // Extracting specific fields for direct columns, and storing full AI output as JSONB
        const newAssessmentData = {
            userId: userId || null, // Link to user if logged in, otherwise null
            address: aiResults.request_details.address,
            latitude: aiResults.request_details.latitude,
            longitude: aiResults.request_details.longitude,
            inputParams: aiResults.request_details, // Store original request as input params
            aiResults: aiResults.ai_image_analysis, // Store detailed AI image analysis
            rawImageAnalysis: null, // Placeholder, if Python returns raw image analysis data
            estimatedKwhPerYear: aiResults.solar_financial_analysis.estimated_annual_kwh_production,
            estimatedPaybackYears: parseFloat(aiResults.solar_financial_analysis.roi_analysis.payback_period_years) || null, // Convert 'N/A' to null
            systemSizeKw: aiResults.solar_financial_analysis.estimated_system_size_kw,
            // Add other fields from aiResults.solar_financial_analysis if needed for direct columns
        };

        // 3. Save assessment to PostgreSQL via Sequelize
        const createdAssessment = await db.RooftopAssessment.create(newAssessmentData);
        console.log('Assessment saved to DB:', createdAssessment.id);

        // 4. Return the full assessment results to the frontend
        res.status(200).json({
            message: 'Solar assessment completed and saved successfully!',
            assessmentId: createdAssessment.id,
            data: aiResults // Send the full AI response back to the frontend
        });

    } catch (error) {
        console.error('Error during solar assessment:', error.message);
        if (error.response) {
            // Error from Python backend (e.g., Python threw HTTPException)
            console.error('Python API Error Response:', error.response.data);
            return res.status(error.response.status || 500).json({
                error: 'Error from AI analysis engine',
                details: error.response.data.detail || error.response.data.error || 'Unknown error from Python'
            });
        }
        // Other errors (network, database, etc.)
        res.status(500).json({ error: 'Internal Server Error during solar assessment', details: error.message });
    }
});

// --- User Authentication Routes (Enhanced for DB interaction) ---
const bcrypt = require('bcrypt'); // We'll add this dependency for password hashing

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required: username, email, password.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        const newUser = await db.User.create({ username, email, passwordHash: hashedPassword });
        res.status(201).json({ message: 'User registered successfully!', user: { id: newUser.id, username: newUser.username, email: newUser.email } });
    } catch (error) {
        console.error('Error registering user:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'User with this username or email already exists.' });
        }
        res.status(500).json({ error: 'Failed to register user', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // In a real application, you'd generate a JWT token here
        res.status(200).json({ message: 'Login successful!', user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal server error during login', details: error.message });
    }
});


// --- Placeholder for retrieving specific assessment from DB ---
app.get('/api/assessments/:id', async (req, res) => {
    try {
        const assessment = await db.RooftopAssessment.findByPk(req.params.id);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }
        res.status(200).json(assessment);
    } catch (error) {
        console.error('Error fetching assessment by ID:', error);
        res.status(500).json({ error: 'Failed to fetch assessment', details: error.message });
    }
});

// Example: Get all assessments (for testing DB connection) - already there, but keeping for clarity
app.get('/api/assessments', async (req, res) => {
    try {
        const assessments = await db.RooftopAssessment.findAll();
        res.status(200).json(assessments);
    } catch (error) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({ error: 'Failed to fetch assessments', details: error.message });
    }
});