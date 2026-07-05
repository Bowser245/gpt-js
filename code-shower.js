// Initialisation de l'objet global de configuration
window.CodeState = {
    // Stockage des configurations de fichiers
    config: {},

    // Fonction pour définir les fichiers à charger
    setup: function(settings) {
        this.config = settings;
    },

    // Fonction principale qui cherche les conteneurs et charge le code
    init: function() {
        // On cherche tous les éléments qui ont un attribut 'data-code-src'
        const codeContainers = document.querySelectorAll('[data-code-src]');

        codeContainers.forEach((container) => {
            // On récupère la clé de configuration (ex: "code1")
            const configKey = container.getAttribute('data-code-src');
            const fileConfig = this.config[configKey];

            if (!fileConfig) {
                console.warn(`Configuration manquante pour la clef : ${configKey}`);
                return;
            }

            const filename = fileConfig.filename;
            // On extrait l'extension du fichier (ex: "sh", "py", "js") pour l'afficher en titre
            const extension = filename.split('.').pop().toUpperCase();

            // On charge dynamiquement le contenu du fichier
            fetch(filename)
                .then(response => {
                    if (!response.ok) throw new Error(`Impossible de charger ${filename}`);
                    return response.text();
                })
                .then(codeContent => {
                    // On génère le HTML propre à ce bloc de code
                    this.renderBlock(container, extension, codeContent, fileConfig.description);
                })
                .catch(error => {
                    container.innerHTML = `<p style="color: #f38ba8;">Erreur : ${error.message}</p>`;
                });
        });
    },

    // Génération du HTML et injection des styles
    renderBlock: function(container, extension, content, description) {
        container.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 20px; background-color: #f8f9fa; border-radius: 8px;";
        
        // Sécurisation du contenu pour éviter les injections HTML (< devient &lt;)
        const safeContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        container.innerHTML = `
            ${description ? `<p style="margin-bottom: 10px; font-weight: 500;">${description}</p>` : ''}
            <div class="code-block-inner" style="background-color: #1e1e1e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div class="code-header" style="display: flex; justify-content: space-between; align-items: center; background-color: #2d2d2d; padding: 8px 16px; color: #bcbcbc; font-size: 0.85rem; font-family: monospace;">
                    <span>${extension}</span>
                    <button class="copy-button" style="background-color: #3a3a3a; color: #ffffff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: background 0.2s ease, transform 0.1s ease; display: flex; align-items: center; gap: 5px; font-family: inherit;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copier</span>
                    </button>
                </div>
                <pre style="margin: 0; padding: 16px; overflow-x: auto;"><code style="font-family: 'Fira Code', Consolas, Monaco, monospace; color: #dcdcdc; font-size: 0.95rem;">${safeContent}</code></pre>
            </div>
        `;

        // Ajout de l'écouteur d'événement sur le bouton copier fraîchement créé
        const button = container.querySelector('.copy-button');
        button.addEventListener('click', function() {
            navigator.clipboard.writeText(content).then(() => {
                const originalHTML = button.innerHTML;
                const originalBg = button.style.backgroundColor;
                
                button.innerHTML = "Copié !";
                button.style.backgroundColor = "#28a745";

                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.style.backgroundColor = originalBg;
                }, 2000);
            });
        });
    }
};
