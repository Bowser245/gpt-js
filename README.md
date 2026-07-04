# 💬 Widget Chatbot IA Illimité (Gemini API)

Un widget de chat en JavaScript pur, **gratuit à vie, sans aucune limite de messages** et entièrement hébergé sur **GitHub Pages**. 

Ce script permet d'intégrer instantanément un assistant virtuel intelligent sur n'importe quel site web. L'IA est capable d'analyser le contenu textuel de la page courante, de lire un fichier de configuration JSON local, et d'aspirer des bases de connaissances distantes (fichiers `.py`, `.html`, `.txt`, etc.) hébergées sur d'autres dépôts GitHub.

---

## ✨ Fonctionnalités

* **⚡ 100% Sans Serveur (Serverless) :** Le script s'exécute directement dans le navigateur du visiteur. Aucun serveur à maintenir, aucun risque de suppression.
* **♾️ Zéro Limite :** Propulsé par l'API gratuite de Google Gemini (modèle `gemini-3.5-flash`), capable d'encaisser des milliers de requêtes quotidiennes.
* **🧠 RAG Dynamique (Base de connaissances) :** * Lit automatiquement le texte de la page où se trouve l'utilisateur.
    * Analyse un fichier JSON de configuration locale.
    * Télécharge et assimile le code ou le texte de fichiers distants (`.py`, `.html`...) même s'ils sont sur un autre GitHub Pages grâce à un bypass CORS automatique (via jsDelivr).
* **🎨 Intégration Universelle :** S'active sur n'importe quel site (HTML, WordPress, Webflow...) via une simple balise `<script>`.

---

## 🚀 Guide d'Installation Rapide

### 1. Intégration sur tes autres sites web

Ajoute ce bloc de code sur n'importe quel site internet, juste avant la fermeture de la balise `</body>` :

```html
<script>
  window.BotSettings = {
    API_KEY: "TA_CLE_API_GEMINI", // Obtenue gratuitement sur https://aistudio.google.com/api-key
    BASE_URL: "https://nom-de-ton-site/web/racine",
    RULES: "Tu es l'IA officielle de ce site. Réponds poliment et de manière concise en français.", // Change si tu veut
    JSON_FILE: "data.json" // Optionnel : nom du fichier de configuration à la racine de ton site
  };
</script>
<script src="https://github.com/Bowser245/gpt-js/widget.js"></script>
```
### 🛠️ Comment formuler et structurer le fichier JSON ?

Le fichier JSON (par exemple `data.json`) est entièrement libre, mais il doit suivre une structure valide. L'IA est capable de lire n'importe quelle clé ou texte que tu ajoutes dedans. 

Pour que le script fonctionne correctement avec tes bases de connaissances, tu dois respecter une seule règle : utiliser la clé `"knowledge_files"` sous forme de tableau (liste) pour tes liens.

Voici un modèle parfait pour structurer ton fichier :

```json
{
  "nom_du_site": "Mon Projet Tech",
  "knowledge_files": [
    "https://ton-pseudo.github.io/mon-autre-depot/main.py",
    "https://ton-pseudo.github.io/mon-autre-depot/index.html",
    "https://ton-pseudo.github.io/un-autre-site/instructions.txt"
  ]
}
```
