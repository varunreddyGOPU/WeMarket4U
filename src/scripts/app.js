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

    function botReply(question) {
        const q = question.toLowerCase();
        if (q.includes('price') || q.includes('cost')) {
            addMessage('Our products range from $10 to $20. For detailed pricing, please specify the product.', 'bot');
        } else if (q.includes('product 1')) {
            addMessage('Product 1 costs $10.', 'bot');
        } else if (q.includes('product 2')) {
            addMessage('Product 2 costs $15.', 'bot');
        } else if (q.includes('product 3')) {
            addMessage('Product 3 costs $20.', 'bot');
        } else if (q.includes('hello') || q.includes('hi')) {
            addMessage('Hello! How can I help you with pricing or cost questions?', 'bot');
        } else {
            addMessage('Sorry, I can answer questions about cost and pricing. Please ask about a product or service.', 'bot');
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