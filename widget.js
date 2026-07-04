(function() {
    // 1. RÉCUPÉRATION DES PARAMÈTRES CONFIGURÉS PAR LE SITE UTILISATEUR
    const settings = window.BotSettings || {};
    
    const API_KEY = settings.API_KEY || ""; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const baseUrl = settings.BASE_URL || window.location.origin;
    const customRules = settings.RULES || "Agis comme un assistant virtuel d'aide.";
    const jsonFileName = settings.JSON_FILE || "";

    let siteContextText = ""; // Mémoire contenant le JSON, les fichiers et le texte du site

    // Fonction pour transformer un lien GitHub ou GitHub Pages en lien brut compatible CORS via jsDelivr
    function convertToCorsFriendlyUrl(url) {
        try {
            // Si c'est un lien du type ton-pseudo.github.io/ton-repo/chemin/fichier.ext
            if (url.includes(".github.io/")) {
                const urlObj = new URL(url);
                const hostnameParts = urlObj.hostname.split('.');
                const user = hostnameParts[0]; // Récupère le pseudo
                const pathParts = urlObj.pathname.split('/').filter(p => p !== "");
                const repo = pathParts[0]; // Récupère le nom du dépôt
                const fileBranchAndPath = pathParts.slice(1).join('/'); // Récupère le reste du chemin
                
                // On utilise la branche par défaut 'main' (tu peux la changer si besoin)
                return `https://cdn.jsdelivr.net/gh/${user}/${repo}@main/${fileBranchAndPath}`;
            }
            // Si c'est un lien github.com/user/repo/blob/main/fichier.ext
            if (url.includes("github.com/") && url.includes("/blob/")) {
                return url.replace("github.com", "cdn.jsdelivr.net/gh").replace("/blob/", "/");
            }
        } catch (e) {
            console.log("Erreur de conversion de l'URL :", e);
        }
        return url; // Retourne l'URL inchangée si ce n'est pas du GitHub
    }

    // 2. CHARGEMENT DES DONNÉES DU SITE (JSON + FICHIERS DE CONNAISSANCE + TEXTE)
    async function initBotContext() {
        if (API_KEY === "") {
            console.error("La cle api doit etre fournie");
            return;
        }

        let jsonContent = "";
        let extraFilesContent = "";
        
        // Étape A : Essayer de lire le fichier JSON
        if (jsonFileName) {
            try {
                const jsonUrl = baseUrl.endsWith('/') ? `${baseUrl}${jsonFileName}` : `${baseUrl}/${jsonFileName}`;
                const response = await fetch(jsonUrl);
                if (response.ok) {
                    const data = await response.json();
                    jsonContent = JSON.stringify(data, null, 2);

                    // Recherche et lecture des fichiers de base de connaissance additionnels
                    if (data.knowledge_files && Array.isArray(data.knowledge_files)) {
                        for (let fileUrl of data.knowledge_files) {
                            try {
                                // Conversion automatique pour accepter le cross-origin depuis un autre GitHub
                                const corsUrl = convertToCorsFriendlyUrl(fileUrl);
                                
                                const fileResponse = await fetch(corsUrl);
                                if (fileResponse.ok) {
                                    const fileText = await fileResponse.text();
                                    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                                    extraFilesContent += `\n--- CONTENU DU FICHIER SOURCE [${fileName}] ---\n${fileText}\n`;
                                }
                            } catch (err) {
                                console.log("Impossible de charger le fichier de connaissance : " + fileUrl, err);
                            }
                        }
                    }
                }
            } catch (e) {
                console.log("Impossible de charger le fichier JSON specifie :", e);
            }
        }

        // Étape B : Extraire le texte principal de la page actuelle
        const pageText = document.body.innerText || "";
        const cleanPageText = pageText.replace(/\s+/g, ' ').substring(0, 5000); 

        // Étape C : Fusionner le tout pour créer la règle de contexte globale de l'IA
        siteContextText = `
        REGLES STRICTES DE COMPORTEMENT :
        ${customRules}

        DONNEES DU FICHIER JSON DU SITE :
        ${jsonContent ? jsonContent : "Aucune donnee JSON fournie."}

        BASES DE CONNAISSANCES SUPPLEMENTAIRES (FICHIERS SOURCES) :
        ${extraFilesContent ? extraFilesContent : "Aucun fichier source supplementaire connecte."}

        CONTENU DE LA PAGE ACTUELLE OU SE TROUVE L'UTILISATEUR :
        ${cleanPageText}
        
        Consigne : Utilise l'ensemble des informations ci-dessus (règles, structures JSON, fichiers sources associés et texte de la page) pour répondre précisément et techniquement aux questions de l'utilisateur. Si l'information n'est pas dedans, réponds de ton mieux ou invite-les à contacter le support du site.
        `;
    }

    initBotContext();

    // 3. INJECTION DU STYLE CSS
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

    // 4. INJECTION DE LA STRUCTURE HTML
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'gh-chat-widget';
    widgetContainer.innerHTML = `
        <div id="gh-chat-header">Assistant IA Dynamique</div>
        <div id="gh-chat-messages">
            <div class="gh-msg gh-bot">Bonjour ! Je connais le contenu de ce site, ses fichiers de configuration et ses bases de connaissances. Comment puis-je t'aider ?</div>
        </div>
        <div id="gh-chat-input-area">
            <input type="text" id="gh-chat-input" placeholder="Écris ton message ici...">
            <button id="gh-send-btn">Envoyer</button>
        </div>
    `;
    document.body.appendChild(widgetContainer);

    // 5. LOGIQUE DE L'IA (GEMINI) AVEC INJECTION DU CONTEXTE
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

        if (conversationHistory.length === 0) {
            conversationHistory.push({ 
                role: "user", 
                parts: [{ text: siteContextText + `\n\nVoici ma premiere question : ${text}` }] 
            });
        } else {
            conversationHistory.push({ role: "user", parts: [{ text: text }] });
        }

        appendMessage("En train de reflechir...", 'bot');
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
            appendMessage("Desole, une erreur est survenue lors de la recuperation des donnees.", 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
})();
