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

// Smooth scroll is handled by CSS (scroll-behavior). Keep a small enhancement for older browsers.
function enableSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (!id || id === '#') return;
            const el = document.querySelector(id);
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function initTryForm() {
    const form = document.getElementById('try-form');
    if (!form) return;
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const img = document.getElementById('output-img');
    const actions = document.getElementById('result-actions');
    const downloadBtn = document.getElementById('download-btn');
    const shareBtn = document.getElementById('share-btn');
    const description = document.getElementById('description');

    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const promptEl = document.getElementById('prompt');
    const logoEl = document.getElementById('logo');
        const logoPreview = document.getElementById('logo-preview');
        const previewImg = document.getElementById('preview-img');
        const previewSkeleton = document.getElementById('preview-skeleton');

    const nameErr = document.getElementById('name-error');
    const emailErr = document.getElementById('email-error');
    const promptErr = document.getElementById('prompt-error');
    const logoErr = document.getElementById('logo-error');

    function validate() {
        let ok = true;
        // Name (optional in backend but good UX to validate if filled)
        if (nameEl && nameEl.value && nameEl.value.trim().length < 2) {
            nameErr.textContent = 'Please enter at least 2 characters.';
            ok = false;
        } else if (nameErr) nameErr.textContent = '';

        // Email basic validation
        const emailVal = emailEl?.value?.trim();
        if (!emailVal) {
            emailErr.textContent = 'Email is required.';
            ok = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            emailErr.textContent = 'Please enter a valid email.';
            ok = false;
        } else emailErr.textContent = '';

        // Prompt
        if (!promptEl?.value?.trim()) {
            promptErr.textContent = 'Prompt is required.';
            ok = false;
        } else promptErr.textContent = '';

        // Logo
        const file = logoEl?.files?.[0];
        if (!file) {
            logoErr.textContent = 'Logo image is required.';
            ok = false;
        } else if (!/^image\//.test(file.type)) {
            logoErr.textContent = 'Only image files are allowed.';
            ok = false;
        } else logoErr.textContent = '';

        return ok;
    }

    // Drag-and-drop
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
        ;['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
            e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover');
        }));
        ;['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
            e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover');
        }));
        dropzone.addEventListener('drop', (e) => {
            if (!logoEl) return;
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files[0]) {
                logoEl.files = dt.files;
                    showPreview(dt.files[0]);
            }
        });
    }

        function showPreview(file) {
            if (!logoPreview) return;
            if (!file || !/^image\//.test(file.type)) {
                logoPreview.style.display = 'none';
                logoPreview.src = '';
                return;
            }
            const url = URL.createObjectURL(file);
            logoPreview.src = url;
            logoPreview.style.display = 'block';
        }

        if (logoEl) {
            logoEl.addEventListener('change', () => {
                const f = logoEl.files && logoEl.files[0];
                showPreview(f);
            });
        }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        loader.style.display = 'block';
        results.style.display = 'none';
        img.style.display = 'none';
        actions.style.display = 'none';
        description.style.display = 'none';
        if (previewImg) previewImg.style.display = 'none';
        if (previewSkeleton) previewSkeleton.style.display = 'block';

        const formData = new FormData(form);
        const send = new FormData();
        send.append('prompt', formData.get('prompt'));
        // include contact fields for email delivery
        const emailVal = formData.get('email');
        if (emailVal) send.append('email', emailVal);
        const nameVal = formData.get('name');
        if (nameVal) send.append('name', nameVal);
        const phoneVal = formData.get('phone');
        if (phoneVal) send.append('phone', phoneVal);
        const logoFile = formData.get('logo');
        if (logoFile) send.append('logo', logoFile);
        const extra = formData.get('additional_prompt');
        if (extra) send.append('additional_prompt', extra);

            try {
                const res = await fetch('/api/generate-image', { method: 'POST', body: send });
                let data = {};
                try {
                    data = await res.json();
                } catch (parseErr) {
                    // Non-JSON or empty body; surface a helpful message
                    throw new Error(`Request failed (status ${res.status}).`);
                }
            loader.style.display = 'none';
            if (!res.ok) {
                const msg = data?.detail || data?.error || 'An error occurred.';
                results.style.display = 'block';
                results.innerHTML = `<span style="color:#dc2626;">${msg}</span>`;
                return;
            }
            const imageUrl = data.imageUrl || data.output_image_path || '';
            const desc = data.description || '';
            if (imageUrl) {
                img.src = imageUrl;
                img.style.display = 'block';
                results.style.display = 'block';
                actions.style.display = 'flex';
                        if (previewImg) {
                            previewImg.src = imageUrl;
                            previewImg.style.display = 'block';
                        }
                        if (previewSkeleton) previewSkeleton.style.display = 'none';
            }
            if (desc) {
                description.textContent = desc;
                description.style.display = 'block';
            }

            // Download
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = imageUrl;
                a.download = 'generated-image.png';
                document.body.appendChild(a);
                a.click();
                a.remove();
            };

            // Share (copy link)
            shareBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(imageUrl);
                    shareBtn.textContent = 'Link Copied!';
                    setTimeout(() => (shareBtn.textContent = 'Copy Link'), 1500);
                } catch {
                    shareBtn.textContent = 'Copy Failed';
                    setTimeout(() => (shareBtn.textContent = 'Copy Link'), 1500);
                }
            };
        } catch (err) {
            loader.style.display = 'none';
            results.style.display = 'block';
            results.innerHTML = `<span style="color:#dc2626;">Error: ${err.message}</span>`;
                if (previewSkeleton) previewSkeleton.style.display = 'none';
        }
    });

        // Prompt chips
        document.querySelectorAll('.prompt-chips button')?.forEach((btn) => {
            btn.addEventListener('click', () => {
                const chip = btn.getAttribute('data-prompt');
                if (chip) {
                    promptEl.value = chip;
                    promptEl.focus();
                }
            });
        });
}

document.addEventListener('DOMContentLoaded', () => {
    createChatbot();
    enableSmoothScroll();
    initTryForm();
});
