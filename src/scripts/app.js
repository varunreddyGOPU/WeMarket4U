// --- Client-side Chatbot Widget Logic ---
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
    chatBtn.onclick = () => {
        chatWindow.style.display = chatWindow.style.display === 'block' ? 'none' : 'block';
    };
    chatWindow.querySelector('#chatbot-close').onclick = () => {
        chatWindow.style.display = 'none';
    };

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
            const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            addMessage(answer || 'Sorry, I could not get an answer right now.', 'bot');
        } catch {
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

document.addEventListener('DOMContentLoaded', createChatbot);

// --- Server-side code (Node.js + Express) ---
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    require('dotenv').config();
    const express = require('express');
    const fetch = require('node-fetch');
    const app = express();
    app.use(express.json());

    app.post('/api/gemini', async (req, res) => {
        const { question } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: question }] }]
                    })
                }
            );
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: 'AI service error' });
        }
    });

    app.listen(3000, () => console.log('Server running on port 3000'));
}

<script>
document.getElementById('try-form').onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  // Only send fields required by backend
  const backendData = new FormData();
  backendData.append('prompt', formData.get('prompt'));
  backendData.append('logo', formData.get('logo'));
  backendData.append('additional_prompt', formData.get('additional_prompt'));

  const resultDiv = document.getElementById('try-result');
  resultDiv.innerHTML = "Processing...";

  try {
    const response = await fetch('/generate_image_with_logo_and_description', {
      method: 'POST',
      body: backendData
    });
    const data = await response.json();
    if (response.ok) {
      resultDiv.innerHTML = `
        <h3>Generated Image</h3>
        <img src="/${data.output_image_path}" alt="Generated" style="max-width:100%;border-radius:12px;box-shadow:0 2px 12px rgba(79,140,255,0.08);margin-bottom:16px;">
        <h3>Description</h3>
        <div style="white-space:pre-line;">${data.description}</div>
      `;
    } else {
      resultDiv.innerHTML = `<span style="color:red;">${data.detail || data.error || "An error occurred."}</span>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
  }
};
</script>
