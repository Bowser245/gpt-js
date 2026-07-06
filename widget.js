(function() {
    // 1. RÉCUPÉRATION DES PARAMÈTRES CONFIGURÉS PAR LE SITE UTILISATEUR
    const settings = window.BotSettings || {};
     
    const MODE = settings.MODE; 
    if (MODE !== "widget" && MODE !== "page") {
        console.error("Le parametre MODE est obligatoire et doit valoir 'widget' ou 'page'.");
        return;
    }

    const aiName = settings.AI_NAME || "Assistant IA Dynamique";
    const API_KEY = settings.API_KEY || ""; 
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const baseUrl = settings.BASE_URL || window.location.origin;
    
    const customRules = (settings.RULES || "Agis comme un assistant virtuel d'aide.") + 
                        " Pas de Markdown (pas de **, pas de #, pas de listes avec * ou -, pas de blocs de code). Réponds en texte brut fluide. SEULE EXCEPTION : Si tu dois afficher un lien ou une URL, écris-le obligatoirement au format HTML sous la forme : <a href='URL_ICI' target='_blank'>TEXTE_DU_LIEN</a>." +
                        " Tu as accès à deux outils puissants : 'analyser_page' pour voir l'arborescence HTML de la page actuelle (historique, boutons, textes), et 'executer_javascript' pour exécuter du code sur la page (par exemple pour scroller, mettre en valeur, clignoter ou modifier graphiquement un élément si l'utilisateur ne le trouve pas). Utilise-les dès que nécessaire. Attention ces 2 outils utilise le débit API donc utilises les que si c'est vraiment néssésaire." + 
                        " Si tu écécute executer_javascript tu a le droit de rediriger l'utilisateur seulement dans les pages du site exemple la racine doit être " + baseUrl + " si rien est fournie avant tu a INTERDICTION de rediriger l'utilisateur ces utilisations du executer_javascript sont interdites : " + 
                        " Executer des fonctions uniquement appelées via élément HTML, Télécharger des choses." + 
                        " Si via executer_javascript tu veux modifier le presse-papier de l'utilisateur, tu as le droit de générer un code qui utilise navigator.clipboard.writeText('TEXTE'). Une sécurité demandera une confirmation à l'utilisateur avant l'exécution.";
    
    const jsonFileName = settings.JSON_FILE || "";
    let siteContextText = ""; 
    let speechUtterance = null;

    function convertToCorsFriendlyUrl(url) {
        try {
            if (url.includes(".github.io/")) {
                const urlObj = new URL(url);
                const hostnameParts = urlObj.hostname.split('.');
                const user = hostnameParts[0]; 
                const pathParts = urlObj.pathname.split('/').filter(p => p !== "");
                const repo = pathParts[0]; 
                const fileBranchAndPath = pathParts.slice(1).join('/'); 
                return `https://cdn.jsdelivr.net/gh/${user}/${repo}@main/${fileBranchAndPath}`;
            }
            if (url.includes("github.com/") && url.includes("/blob/")) {
                return url.replace("github.com", "cdn.jsdelivr.net/gh").replace("/blob/", "/");
            }
        } catch (e) {
            console.log("Erreur de conversion de l'URL :", e);
        }
        return url; 
    }

    // 2. CHARGEMENT DES DONNÉES DU SITE
    async function initBotContext() {
        if (API_KEY === "") {
            console.error("La cle api doit etre fournie");
            return;
        }

        let jsonContent = "";
        let extraFilesContent = "";
        
        if (jsonFileName) {
            try {
                const jsonUrl = baseUrl.endsWith('/') ? `${baseUrl}${jsonFileName}` : `${baseUrl}/${jsonFileName}`;
                const response = await fetch(jsonUrl);
                if (response.ok) {
                    const data = await response.json();
                    jsonContent = JSON.stringify(data);

                    if (data.knowledge_files && Array.isArray(data.knowledge_files)) {
                        for (let fileUrl of data.knowledge_files) {
                            try {
                                const corsUrl = convertToCorsFriendlyUrl(fileUrl);
                                const fileResponse = await fetch(corsUrl);
                                if (fileResponse.ok) {
                                    const fileText = await fileResponse.text();
                                    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                                    const cleanFileText = fileText.replace(/["'\\]/g, ' ').replace(/[\r\n\t]/g, ' ');
                                    extraFilesContent += ` Source [${fileName}] : ${cleanFileText}. `;
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

        const pageText = document.body.innerText || "";
        const cleanPageText = pageText.replace(/["'\\]/g, ' ').replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').substring(0, 1000); 

        siteContextText = `CONSIGNES ET CONTEXTE GENERAL : ${customRules}. DONNEES DU SITE : ${jsonContent}. BASES : ${extraFilesContent}. TEXTE INITIAL DE LA PAGE : ${cleanPageText}.`;
    }

    initBotContext();

    // 3. INJECTION DU STYLE CSS
    const style = document.createElement('style');
    let cssStyles = `
        :root { --chat-primary: #0084ff; }
        #gh-chat-header { background: var(--chat-primary); color: white; padding: 15px; font-weight: bold; }
        #gh-chat-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
        .gh-msg { max-width: 80%; padding: 10px; border-radius: 10px; font-size: 14px; line-height: 1.4; word-break: break-word; white-space: pre-line; position: relative; }
        .gh-user { background: var(--chat-primary); color: white; align-self: flex-end; }
        .gh-bot { background: #e4e6eb; color: black; align-self: flex-start; }
        .gh-bot a { color: #0084ff; text-decoration: underline; font-weight: bold; }
        #gh-chat-input-area { display: flex; border-top: 1px solid #eee; padding: 10px; background: white; }
        #gh-chat-input { flex: 1; border: none; padding: 10px; outline: none; font-size: 14px; }
        #gh-send-btn { background: var(--chat-primary); color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        
        .gh-action-area { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
        .gh-listen-btn, .gh-exec-btn { background: #ffffff; border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; color: #333; transition: background 0.2s; font-weight: bold; }
        .gh-listen-btn:hover { background: #f0f0f0; }
        .gh-exec-btn { background: #28a745; color: white; border-color: #218838; }
        .gh-exec-btn:hover { background: #218838; }
        .gh-exec-btn.disabled { background: #6c757d; border-color: #6c757d; cursor: not-allowed; opacity: 0.7; }
    `;

    if (MODE === "widget") {
        cssStyles += `
            #gh-chat-toggle-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: var(--chat-primary); color: white; border-radius: 50%; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; z-index: 999999; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: transform 0.3s ease; }
            #gh-chat-toggle-btn:hover { transform: scale(1.05); }
            #gh-chat-widget { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; font-family: Arial, sans-serif; z-index: 999998; }
        `;
    } else if (MODE === "page") {
        cssStyles += ` #gh-chat-widget { width: 100%; height: 100vh; max-width: 100%; background: white; display: flex; flex-direction: column; overflow: hidden; font-family: Arial, sans-serif; } `;
    }

    style.innerHTML = cssStyles;
    document.head.appendChild(style);

    // 4. INJECTION DE LA STRUCTURE HTML
    if (MODE === "widget") {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'gh-chat-toggle-btn';
        toggleButton.innerHTML = '💬'; 
        document.body.appendChild(toggleButton);
    }

    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'gh-chat-widget';
    widgetContainer.innerHTML = `
        <div id="gh-chat-header">${aiName}</div>
        <div id="gh-chat-messages">
            <div class="gh-msg gh-bot">Bonjour ! Je suis ${aiName}. Comment puis-je t'aider aujourd'hui ?</div>
        </div>
        <div id="gh-chat-input-area">
            <input type="text" id="gh-chat-input" placeholder="Écris ton message ici...">
            <button id="gh-send-btn">Envoyer</button>
        </div>
    `;
    
    const targetElement = document.getElementById('gh-chat-page-container') || document.body;
    targetElement.appendChild(widgetContainer);

    if (MODE === "widget") {
        const toggleButton = document.getElementById('gh-chat-toggle-btn');
        toggleButton.addEventListener('click', () => {
            if (widgetContainer.style.display === 'none' || widgetContainer.style.display === '') {
                widgetContainer.style.display = 'flex';
                toggleButton.innerHTML = '❌'; 
            } else {
                widgetContainer.style.display = 'none';
                toggleButton.innerHTML = '💬'; 
            }
        });
    }

    function cleanMarkdown(text) {
        if (!text) return "";
        return text.replace(/```/g, '').replace(/\*\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/^#+\s+/gm, '');
    }

    function gererLectureTexte(texteAEnregistrer, bouton) {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            bouton.innerHTML = "🔊 Écouter";
            return;
        }
        if (!texteAEnregistrer) return;

        speechUtterance = new SpeechSynthesisUtterance(texteAEnregistrer);
        speechUtterance.lang = 'fr-FR';
        speechUtterance.rate = 1; 

        speechUtterance.onstart = () => { bouton.innerHTML = "⏹️ Arrêter"; };
        speechUtterance.onend = () => { bouton.innerHTML = "🔊 Écouter"; };
        speechUtterance.onerror = () => { bouton.innerHTML = "🔊 Écouter"; };

        window.speechSynthesis.speak(speechUtterance);
    }

    // 5. LOGIQUE DE L'IA ET GESTION DES OUTILS (FONCTIONS)
    const messagesContainer = document.getElementById('gh-chat-messages');
    const chatInput = document.getElementById('gh-chat-input');
    const sendBtn = document.getElementById('gh-send-btn');
    let conversationHistory = [];

    const botTools = [{
        functionDeclarations: [
            {
                name: "analyser_page",
                description: "Récupère le contenu HTML complet nettoyé de la page web pour voir sa structure, ses textes et ses boutons."
            },
            {
                name: "executer_javascript",
                description: "Exécute un script JavaScript sur la page web pour interagir avec des éléments (ex: faire défiler la page, ajouter un contour rouge clignotant, copier un texte dans le presse-papier).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        code: { type: "STRING", description: "Le code JavaScript exact à exécuter." }
                    },
                    required: ["code"]
                }
            }
        ]
    }];

    function appendMessage(text, sender, jsCodeToAuthorize = null) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('gh-msg', `gh-${sender}`);
        
        if (sender === 'bot') {
            msgDiv.innerHTML = cleanMarkdown(text);

            if (text !== "En train de réfléchir...") {
                const actionArea = document.createElement('div');
                actionArea.className = 'gh-action-area';

                const listenBtn = document.createElement('button');
                listenBtn.className = 'gh-listen-btn';
                listenBtn.innerHTML = '🔊 Écouter';
                const textToSpeak = msgDiv.innerText; 
                listenBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    gererLectureTexte(textToSpeak, listenBtn);
                });
                actionArea.appendChild(listenBtn);

                if (jsCodeToAuthorize) {
                    const execBtn = document.createElement('button');
                    execBtn.className = 'gh-exec-btn';
                    execBtn.innerHTML = '🛡️ Autoriser l\'exécution du code';
                    
                    execBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (execBtn.classList.contains('disabled')) return;
                        
                        // ANALYSE DU CODE : Vérification de la modification du presse-papier
                        if (jsCodeToAuthorize.includes("clipboard.writeText")) {
                            // On extrait la chaîne de texte à copier pour l'afficher à l'utilisateur
                            let match = jsCodeToAuthorize.match(/writeText\s*\(\s*['"`](.*?)['"`]\s*\)/);
                            let texteExtrait = match ? match[1] : "[Texte inconnu]";
                            
                            // Demande de validation explicite à l'utilisateur
                            let confirmation = confirm(`${aiName} demande a remplacer votre presse-papier par ${texteExtrait}`);
                            if (!confirmation) {
                                execBtn.innerHTML = '❌ Modification refusée par l\'utilisateur';
                                execBtn.classList.add('disabled');
                                return; // On stoppe tout
                            }
                        }

                        try {
                            const runScript = new Function(jsCodeToAuthorize);
                            runScript();
                            execBtn.innerHTML = '✅ Code exécuté avec succès';
                            execBtn.classList.add('disabled');
                        } catch (err) {
                            console.error("Erreur d'exécution du script IA:", err);
                            execBtn.innerHTML = '❌ Erreur lors de l\'exécution';
                        }
                    });
                    actionArea.appendChild(execBtn);
                }

                msgDiv.appendChild(actionArea);
            }
        } else {
            msgDiv.innerText = text;
        }
        
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
                parts: [{ text: `${siteContextText}\n\nQuestion de l'utilisateur : ${text}` }] 
            });
        } else {
            conversationHistory.push({ 
                role: "user", 
                parts: [{ text: text }] 
            });
        }

        appendMessage("En train de réfléchir...", 'bot');
        const loadingMsg = messagesContainer.lastChild;

        await appelerGemini(loadingMsg);
    }

    async function appelerGemini(loadingElementToClean) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: conversationHistory,
                    tools: botTools
                })
            });

            const data = await response.json();
            if (loadingElementToClean) loadingElementToClean.remove();
            
            if (data.error) {
                appendMessage("Erreur de l'assistant: " + data.error.message, 'bot');
                return;
            }

            const part = data.candidates[0].content.parts[0];

            if (part.functionCall) {
                const funcName = part.functionCall.name;
                const funcArgs = part.functionCall.args;

                conversationHistory.push({
                    role: "model",
                    parts: [part]
                });

                if (funcName === "analyser_page") {
                    const htmlContent = document.body.innerHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                    const cleanHtml = htmlContent.substring(0, 4000);
                    
                    conversationHistory.push({
                        role: "user",
                        parts: [{
                            functionResponse: {
                                name: "analyser_page",
                                response: { result: "Contenu de la page récupéré avec succès.", html: cleanHtml }
                            }
                        }]
                    });

                    appendMessage("Analyse de la page en cours...", 'bot');
                    const nextLoading = messagesContainer.lastChild;
                    await appelerGemini(nextLoading);

                } else if (funcName === "executer_javascript") {
                    const codeToRun = funcArgs.code;
                    
                    appendMessage("J'ai préparé une action pour t'aider sur la page. Clique sur le bouton ci-dessous pour l'activer.", 'bot', codeToRun);
                    
                    conversationHistory.push({
                        role: "user",
                        parts: [{
                            functionResponse: {
                                name: "executer_javascript",
                                response: { result: "Le script a été proposé à l'utilisateur via un bouton de validation." }
                            }
                        }]
                    });
                }

            } else {
                const botResponse = part.text;
                appendMessage(botResponse, 'bot');
                
                conversationHistory.push({ 
                    role: "model", 
                    parts: [{ text: botResponse }] 
                });
            }

        } catch (error) {
            console.error("Erreur:", error);
            if (loadingElementToClean) loadingElementToClean.remove();
            appendMessage("Desole, une erreur est survenue.", 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
})();
