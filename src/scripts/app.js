// This file contains the JavaScript code for the website. 
// It handles interactivity and dynamic content on the webpage.

// --- Chatbot Widget Logic ---
function createChatbot() {
    // Create chat button
    const chatBtn = document.createElement('div');
    chatBtn.id = 'chatbot-toggle';
    chatBtn.textContent = '💬 Chat';
    chatBtn.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; background: #4f8cff; color: #fff;
        border-radius: 50px; padding: 14px 24px; cursor: pointer; font-weight: bold;
        box-shadow: 0 2px 12px rgba(79,140,255,0.18); z-index: 9999;
    `;
    document.body.appendChild(chatBtn);

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatbot-window';
    chatWindow.style.cssText = `
        display: none; position: fixed; bottom: 80px; right: 30px; width: 320px; max-width: 90vw;
        background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(79,140,255,0.18);
        z-index: 10000; padding: 0; overflow: hidden; font-family: inherit;
    `;
    chatWindow.innerHTML = `
        <div style="background:#4f8cff;color:#fff;padding:12px 16px;font-weight:bold;">
            WeMarket4U Chatbot
            <span id="chatbot-close" style="float:right;cursor:pointer;">&times;</span>
        </div>
        <div id="chatbot-messages" style="padding:16px;height:220px;overflow-y:auto;font-size:1rem;background:#f7faff;"></div>
        <form id="chatbot-form" style="display:flex;border-top:1px solid #eee;">
            <input id="chatbot-input" type="text" placeholder="Ask about cost or pricing..." autocomplete="off" style="flex:1;padding:10px;border:none;font-size:1rem;">
            <button type="submit" style="background:#4f8cff;color:#fff;border:none;padding:0 18px;cursor:pointer;">Send</button>
        </form>
    `;
    document.body.appendChild(chatWindow);

    // Toggle chat window
    chatBtn.onclick = () => chatWindow.style.display = chatWindow.style.display === 'block' ? 'none' : 'block';
    chatWindow.querySelector('#chatbot-close').onclick = () => chatWindow.style.display = 'none';

    // Chatbot logic
    const messages = chatWindow.querySelector('#chatbot-messages');
    const form = chatWindow.querySelector('#chatbot-form');
    const input = chatWindow.querySelector('#chatbot-input');

    function addMessage(text, from = 'user') {
        const msg = document.createElement('div');
        msg.style.margin = '8px 0';
        msg.style.textAlign = from === 'user' ? 'right' : 'left';
        msg.innerHTML = `<span style="display:inline-block;max-width:80%;padding:8px 12px;border-radius:12px;
            background:${from === 'user' ? '#4f8cff' : '#e0e7ff'};color:${from === 'user' ? '#fff' : '#35424a'};">
            ${text}</span>`;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    }

    async function botReply(question) {
        addMessage('Thinking...', 'bot');
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            const data = await response.json();
            messages.lastChild.remove();
            if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                addMessage(data.candidates[0].content.parts[0].text.trim(), 'bot');
            } else {
                addMessage('Sorry, I could not get an answer right now.', 'bot');
            }
        } catch (err) {
            messages.lastChild.remove();
            addMessage('Sorry, there was an error connecting to the AI.', 'bot');
        }
    }

    form.onsubmit = function(e) {
        e.preventDefault();
        const userInput = input.value.trim();
        if (!userInput) return;
        addMessage(userInput, 'user');
        setTimeout(() => botReply(userInput), 500);
        input.value = '';
    };
}

// --- Existing logic (if you want to keep it) ---
document.addEventListener('DOMContentLoaded', function() {
    // Optional: Remove or update this block if not needed
    /*
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = 'Welcome to WeMarket4U!';
    }

    const items = [
        { name: 'Product 1', price: 10 },
        { name: 'Product 2', price: 15 },
        { name: 'Product 3', price: 20 }
    ];

    const itemList = document.getElementById('item-list');
    if (itemList) {
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.name} - $${item.price}`;
            itemList.appendChild(listItem);
        });
    }

    const cartButton = document.getElementById('cart-button');
    if (cartButton) {
        cartButton.addEventListener('click', function() {
            alert('Cart functionality is not implemented yet.');
        });
    }
    */
    createChatbot();
});

// --- Server-side code (Node.js + Express) ---
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
    const { question } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
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
});

app.listen(3000, () => console.log('Server running on port 3000'));
GEMINI_API_KEY=your_real_gemini_api_key
// GEMINI_API_KEY=your_real_gemini_api_key