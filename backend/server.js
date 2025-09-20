require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));
// Email helper (configure SMTP via env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    } : undefined
});

async function sendEmail(to, subject, html) {
    if (!to) return;
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || 'no-reply@wemarket4u.com',
            to,
            subject,
            html
        });
    } catch (e) {
        console.error('Email send failed:', e.message);
    }
}


// Gemini proxy endpoint
app.post('/api/gemini', async (req, res) => {
    const { question } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
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

// Image generation proxy: forwards to Python FastAPI
const upload = multer({
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.mimetype)) return cb(null, true);
        return cb(new Error('Invalid file type'));
    }
});

app.post('/api/generate-image', upload.single('logo'), async (req, res) => {
    try {
        const PY_BACKEND_URL = process.env.PY_BACKEND_URL || 'http://127.0.0.1:8000';
        if (!req.file) {
            return res.status(400).json({ error: 'Logo image is required and must be an image file.' });
        }
        const form = new FormData();
        form.append('prompt', req.body.prompt || '');
        if (req.body.additional_prompt) form.append('additional_prompt', req.body.additional_prompt);
        // forward optional contact fields to Python (ignored if not used)
        if (req.body.email) form.append('email', req.body.email);
        if (req.body.name) form.append('name', req.body.name);
        if (req.body.phone) form.append('phone', req.body.phone);
        if (req.file) {
            form.append('logo', fs.createReadStream(req.file.path), {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });
        }
        const resp = await fetch(`${PY_BACKEND_URL}/generate_image_with_logo_and_description`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });
        let data = {};
        try {
            data = await resp.json();
        } catch (e) {
            // Python might have errored with non-JSON; map to error
            const text = await resp.text();
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(resp.status || 500).json({ error: 'Backend error', detail: text });
        }
        // Clean up uploaded temp file
        if (req.file) fs.unlink(req.file.path, () => {});
        if (!resp.ok) {
            return res.status(resp.status).json(data);
        }
        // If Python returns a relative path located under backend/, build a URL we serve statically from project root
        let imageUrl = '';
        if (data.output_image_path) {
            imageUrl = data.output_image_path.startsWith('http')
                ? data.output_image_path
                : `/backend/${data.output_image_path.replace(/^\/?backend\/?/, '')}`;
        }
        // Send email if address provided
        if (req.body.email && imageUrl) {
            const body = `
                <p>Hi ${req.body.name || ''},</p>
                <p>Your AI-generated image is ready.</p>
                <p><a href="${imageUrl}">Download image</a></p>
                <p>Description:</p>
                <pre style="font-family:inherit;white-space:pre-wrap;">${(data.description || '').replace(/</g, '&lt;')}</pre>
            `;
            sendEmail(req.body.email, 'Your WeMarket4U generated image', body);
        }
        return res.json({ imageUrl, description: data.description });
    } catch (err) {
        console.error('Error in /api/generate-image:', err);
        return res.status(500).json({ error: 'Image generation failed' });
    }
});

// Minimal analytics endpoint (append-only log)
app.post('/api/track', express.json(), async (req, res) => {
    try {
        const { event, variant, meta } = req.body || {};
        if (!event) return res.status(400).json({ error: 'event is required' });
        const dir = path.join(__dirname, 'logs');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const line = JSON.stringify({ ts: new Date().toISOString(), event, variant, meta }) + '\n';
        fs.appendFile(path.join(dir, 'events.log'), line, () => {});
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'tracking_failed' });
    }
});

// Error handler for upload issues
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 5MB)' });
    if (err && err.message && /Invalid file type/i.test(err.message)) return res.status(400).json({ error: 'Only image files are allowed' });
    return res.status(500).json({ error: 'Server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));