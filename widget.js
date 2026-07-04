(function() {
    // 1. CONFIGURATION - REMPLACE PAR TA CLÉ API GEMINI
    const API_KEY = "TA_CLE_API_GEMINI_ICI"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    // 2. INJECTION DU STYLE CSS
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --chat-primary: #0084ff; }
        #gh-chat-widget {
            position: fixed; bottom: 20px; right: 20px;
            width: 350px; height: 500px;
            background: white; border-radius: 12px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.15);
            display: flex; flex-direction: column; overflow: hidden;
            font-family: Arial, sans-serif; z-index: 999999;
        }
        #gh-chat-header { background: var(--chat-primary); color: white; padding: 15px; font-weight: bold; }
        #gh-chat-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
        .gh-msg { max-width: 80%; padding: 10px; border-radius: 10px; font-size: 14px; line-height: 1.4; }
        .gh-user { background: var(--chat-primary); color: white; align-self: flex-end; }
        .gh-bot { background: #e4e6eb; color: black; align-self: flex-start; }
        #gh-chat-input-area { display: flex; border-top: 1px solid #eee; padding: 10px; background: white; }
        #gh-chat-input { flex: 1; border: none; padding: 10px; outline: none; font-size: 14px; }
        #gh-send-btn { background: var(--chat-primary); color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // 3. INJECTION DU STRUCTURE HTML
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'gh-chat-widget';
    widgetContainer.innerHTML = `
        <div id="gh-chat-header">Assistant IA</div>
        <div id="gh-chat-messages">
            <div class="gh-msg gh-bot">Bonjour ! Comment puis-je t'aider aujourd'hui ou t'accompagner dans tes projets ?</div>
        </div>
        <div id="gh-chat-input-area">
            <input type="text" id="gh-chat-input" placeholder="Écris ton message ici...">
            <button id="gh-send-btn">Envoyer</button>
        </div>
    `;
    document.body.appendChild(widgetContainer);

    // 4. LOGIQUE DE L'IA (GEMINI)
    const messagesContainer = document.getElementById('gh-chat-messages');
    const chatInput = document.getElementById('gh-chat-input');
    const sendBtn = document.getElementById('gh-send-btn');
    let conversationHistory = [];

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('gh-msg', `gh-${sender}`);
        msgDiv.innerText = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';
        conversationHistory.push({ role: "user", parts: [{ text: text }] });

        appendMessage("En train de réfléchir...", 'bot');
        const loadingMsg = messagesContainer.lastChild;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            const data = await response.json();
            const botResponse = data.candidates[0].content.parts[0].text;

            loadingMsg.remove();
            appendMessage(botResponse, 'bot');
            conversationHistory.push({ role: "model", parts: [{ text: botResponse }] });

        } catch (error) {
            loadingMsg.remove();
            appendMessage("Désolé, une erreur est survenue.", 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
})();
