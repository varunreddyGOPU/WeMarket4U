require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// Gemini proxy endpoint
app.post('/api/gemini', async (req, res) => {
    const { question } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Gemini API Key:', apiKey); // TEMP: Remove in production
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: question }]
                }]
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Error connecting to Gemini API' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));