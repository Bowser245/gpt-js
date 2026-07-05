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
        const codeContainers = document.querySelectorAll('[data-code-src]');

        codeContainers.forEach((container) => {
            const configKey = container.getAttribute('data-code-src');
            const fileConfig = this.config[configKey];

            if (!fileConfig) {
                console.warn(`Configuration manquante pour la clef : ${configKey}`);
                return;
            }

            const filename = fileConfig.filename;
            const extension = filename.split('.').pop().toUpperCase();

            fetch(filename)
                .then(response => {
                    if (!response.ok) throw new Error(`Impossible de charger ${filename}`);
                    return response.text();
                })
                .then(codeContent => {
                    this.renderBlock(container, extension, codeContent, fileConfig.description);
                })
                .catch(error => {
                    container.innerHTML = `<p style="color: #f38ba8;">Erreur : ${error.message}</p>`;
                });
        });
    },

    // Génération du HTML avec numérotation des lignes et styles injectés
    renderBlock: function(container, extension, content, description) {
        container.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 20px; background-color: #f8f9fa; border-radius: 8px;";
        
        // Découpage du code par ligne pour générer les numéros
        const lines = content.split('\n');
        
        // Génération de la colonne des numéros de ligne
        let lineNumbersHTML = '';
        // Génération de la colonne du code sécurisé
        let codeLinesHTML = '';

        lines.forEach((line, index) => {
            // Évite d'afficher une ligne numérotée vide tout à la fin si le fichier finit par un saut de ligne
            if (index === lines.length - 1 && line.trim() === '') return;

            lineNumbersHTML += `<div style="color: #5c6370; text-align: right; padding-right: 12px; user-select: none;">${index + 1}</div>`;
            
            const safeLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            // On conserve les lignes vides visuellement avec un espace insécable si nécessaire
            codeLinesHTML += `<div style="white-space: pre;">${safeLine || ' '}</div>`;
        });

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
                
                <div style="display: grid; grid-template-columns: auto 1fr; padding: 16px; overflow-x: auto; font-family: 'Fira Code', Consolas, Monaco, monospace; font-size: 0.95rem; background-color: #1e1e1e;">
                    <div style="border-right: 1px solid #3e4451; margin-right: 12px; font-variant-numeric: tabular-nums;">
                        ${lineNumbersHTML}
                    </div>
                    <div class="code-content-area" style="color: #dcdcdc;">
                        ${codeLinesHTML}
                    </div>
                </div>
            </div>
        `;

        // Événement Copier
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
