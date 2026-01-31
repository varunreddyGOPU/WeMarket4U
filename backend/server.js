require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const OpenAI = require('openai');
const sharp = require('sharp');
const {
    findOrCreateLead,
    createGeneration,
    updateGeneration,
    failGeneration,
    getGenerationsByEmail,
    getLeadByEmail,
    getGenerationById
} = require('./database');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.open_ai_api_key_mm
});

// Perplexity Sonar API for descriptions
const SONAR_API_URL = 'https://api.perplexity.ai/chat/completions';
const SONAR_API_KEY = process.env.SONAR_API_KEY;

const app = express();
app.use(express.json());

// Enable CORS for all origins
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve generated images statically
app.use('/generated', express.static(path.join(__dirname, 'generated')));

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
    // Skip if no recipient or SMTP not configured
    if (!to || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('Email skipped: SMTP not configured');
        return;
    }
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || 'no-reply@wemarket4u.com',
            to,
            subject,
            html
        });
        console.log('Email sent successfully to:', to);
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

// Helper: Get marketing description from Perplexity Sonar
async function getSonarDescription(prompt) {
    const engineeredPrompt = `Write a detailed, engaging, and promotional product description for the following prompt:
"${prompt}"
Highlight the key features, unique benefits, and reasons to choose this product. Make it sound appealing and persuasive, as if for a high-converting advertisement. Include a call to action at the end.`;

    try {
        const response = await fetch(SONAR_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SONAR_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [{ role: 'user', content: engineeredPrompt }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || 'Description unavailable.';
        }
        return 'Marketing description unavailable.';
    } catch (err) {
        console.error('Sonar API error:', err.message);
        return 'Marketing description unavailable.';
    }
}

// Helper: Generate image with OpenAI DALL-E 3
async function generateImageWithOpenAI(prompt) {
    const enhancedPrompt = `${prompt}. Professional marketing style, high quality, commercial photography, brand-focused.`;
    
    const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        size: '1024x1024',
        quality: 'hd',
        n: 1
    });
    
    if (!response.data || response.data.length === 0) {
        throw new Error('No image generated');
    }
    
    return response.data[0].url;
}

// Helper: Add logo to image using sharp
async function addLogoToImage(imageBuffer, logoPath) {
    const logoBuffer = await sharp(logoPath)
        .resize(100, null, { fit: 'inside' })
        .toBuffer();
    
    const logoMeta = await sharp(logoBuffer).metadata();
    const imageMeta = await sharp(imageBuffer).metadata();
    
    const x = imageMeta.width - logoMeta.width - 10;
    const y = imageMeta.height - logoMeta.height - 10;
    
    return sharp(imageBuffer)
        .composite([{ input: logoBuffer, left: x, top: y }])
        .png()
        .toBuffer();
}

// Image generation - now using OpenAI directly
// Use unique filenames to avoid overwrites with concurrent users
const upload = multer({
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.mimetype)) return cb(null, true);
        return cb(new Error('Invalid file type'));
    }
});

// Ensure generated images directory exists
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

app.post('/api/generate-image', upload.single('logo'), async (req, res) => {
    let generationId = null;
    
    try {
        const PY_BACKEND_URL = process.env.PY_BACKEND_URL || 'http://127.0.0.1:8000';
        if (!req.file) {
            return res.status(400).json({ error: 'Logo image is required and must be an image file.' });
        }
        
        // Step 1: Save lead to database
        const email = req.body.email || '';
        const name = req.body.name || '';
        const phone = req.body.phone || '';
        const prompt = req.body.prompt || '';
        const additionalPrompt = req.body.additional_prompt || '';
        
        let lead = null;
        if (email) {
            try {
                lead = await findOrCreateLead(email, name, phone);
                // Create generation record with pending status
                const gen = await createGeneration(
                    lead.id, 
                    prompt, 
                    additionalPrompt, 
                    req.file.originalname
                );
                generationId = gen.id;
            } catch (dbErr) {
                console.error('Database error (continuing anyway):', dbErr.message);
            }
        }
        
        // Generate unique filename for this request
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        const outputFilename = `gen_${timestamp}_${uniqueId}.png`;
        const outputPath = path.join(generatedDir, outputFilename);
        
        // Combine prompt
        let fullPrompt = prompt;
        if (additionalPrompt) {
            fullPrompt += ` ${additionalPrompt}`;
        }
        
        // Step 2: Generate image with OpenAI DALL-E 3
        console.log('Generating image with OpenAI...');
        const imageUrl = await generateImageWithOpenAI(fullPrompt);
        
        // Download the generated image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to download generated image');
        }
        let imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        // Step 3: Add logo to image
        console.log('Adding logo to image...');
        imageBuffer = await addLogoToImage(imageBuffer, req.file.path);
        
        // Save the final image
        fs.writeFileSync(outputPath, imageBuffer);
        
        // Step 4: Generate marketing description with Sonar
        console.log('Generating marketing description...');
        const description = await getSonarDescription(fullPrompt);
        
        // Clean up uploaded temp file
        if (req.file) fs.unlink(req.file.path, () => {});
        
        // Build full image URL for response (needed for cross-origin downloads)
        const baseUrl = process.env.BASE_URL || 'https://wemarket4u-production.up.railway.app';
        const finalImageUrl = `${baseUrl}/generated/${outputFilename}`;
        
        // Update generation record with success
        if (generationId) {
            try {
                await updateGeneration(generationId, finalImageUrl, description || '');
            } catch (dbErr) {
                console.error('Failed to update generation record:', dbErr.message);
            }
        }
        
        // Send email if address provided
        if (req.body.email && finalImageUrl) {
            const body = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #4f8cff 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                        .content { background: #f7faff; padding: 30px; border-radius: 0 0 12px 12px; }
                        .image-preview { max-width: 100%; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .button { display: inline-block; background: #4f8cff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
                        .description { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #4f8cff; }
                        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin:0;">🎨 Your AI Image is Ready!</h1>
                        </div>
                        <div class="content">
                            <p>Hi ${req.body.name || 'there'},</p>
                            <p>Great news! Your AI-generated marketing visual has been created successfully.</p>
                            
                            <p><strong>Your prompt:</strong> "${prompt}"</p>
                            
                            <p style="text-align:center;">
                                <a href="${finalImageUrl}" class="button">📥 Download Your Image</a>
                            </p>
                            
                            <div class="description">
                                <h3 style="margin-top:0;">📝 Marketing Copy</h3>
                                <p>${(description || 'Your promotional description will appear here.').replace(/\n/g, '<br>')}</p>
                            </div>
                            
                            <div class="footer">
                                <p>Thank you for using WeMarket4U!</p>
                                <p>Want more? <a href="${baseUrl}#try-product">Generate another image</a></p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;
            sendEmail(req.body.email, '🎨 Your WeMarket4U AI Image is Ready!', body);
        }
        return res.json({ 
            imageUrl: finalImageUrl, 
            description: description,
            generationId: generationId || null
        });
    } catch (err) {
        console.error('Error in /api/generate-image:', err);
        
        // Clean up uploaded file on error
        if (req.file) fs.unlink(req.file.path, () => {});
        
        // Mark generation as failed in database
        if (generationId) {
            try {
                await failGeneration(generationId, err.message);
            } catch (dbErr) {
                console.error('Failed to update generation failure:', dbErr.message);
            }
        }
        
        return res.status(500).json({ error: 'Image generation failed', detail: err.message });
    }
});

// API: Get user's generation history by email
app.get('/api/history/:email', async (req, res) => {
    try {
        const email = req.params.email;
        if (!email) return res.status(400).json({ error: 'Email is required' });
        
        const generations = await getGenerationsByEmail(email);
        const lead = await getLeadByEmail(email);
        
        res.json({
            lead: lead || null,
            generations: generations || [],
            total: generations.length
        });
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// API: Get single generation details
app.get('/api/generation/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid generation ID' });
        
        const generation = await getGenerationById(id);
        if (!generation) return res.status(404).json({ error: 'Generation not found' });
        
        res.json(generation);
    } catch (err) {
        console.error('Error fetching generation:', err);
        res.status(500).json({ error: 'Failed to fetch generation' });
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

// Start server - bind to 0.0.0.0 for Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));