# 🤖 Chatbot IA Millau — v2

**Assistant virtuel configurable** pour les commerces de Millau (Aveyron).  
Propulsé par Claude AI (Anthropic) · Déploiement Netlify en 5 min.

---

## 📁 Structure du projet

```
millau-chatbot/
├── index.html                   # Frontend (UI + appels vers /api/chat)
├── netlify.toml                 # Config Netlify + headers sécurité
├── package.json                 # Dépendances Node.js
├── README.md
└── netlify/
    └── functions/
        └── chat.js              # Backend sécurisé (API key, rate limiting)
```

---

## 🚀 Déploiement Netlify — 5 étapes

### 1. Créer un dépôt GitHub
Uploader tous les fichiers de ce dossier sur GitHub.

### 2. Connecter à Netlify
→ [netlify.com](https://netlify.com) → **"Add new site"** → **"Import from Git"**  
Sélectionner votre repo GitHub.

### 3. Configurer les variables d'environnement
Dans Netlify : **Site settings → Environment variables** → Ajouter :

| Clé | Valeur |
|-----|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (votre clé Anthropic) |
| `ALLOWED_ORIGINS` | `https://votre-site.netlify.app` |

> 💡 Obtenez votre clé sur [console.anthropic.com](https://console.anthropic.com)

### 4. Déployer
Netlify détecte automatiquement `netlify.toml` et déploie.  
Le build command est vide (site statique + functions).

### 5. Tester
Ouvrez `https://votre-site.netlify.app` → Sélectionnez un établissement → Testez !

---

## 🔒 Sécurité (ce qui est en place)

- ✅ **API key côté serveur uniquement** — jamais dans le frontend
- ✅ **Rate limiting** — 15 req/min/IP (ajustable dans `chat.js`)
- ✅ **Validation & sanitisation** des messages
- ✅ **Limite historique** — 10 derniers messages + 800 chars/message
- ✅ **CORS strict** — domaine contrôlé via `ALLOWED_ORIGINS`
- ✅ **Headers sécurité** — CSP, X-Frame-Options, XSS-Protection
- ✅ **Logs sans données sensibles** — les prompts ne sont pas loggés

---

## 💰 Coût estimé

| Composant | Coût |
|-----------|------|
| Netlify Starter | **Gratuit** (125k req functions/mois) |
| Claude Haiku 4.5 | ~0,001 €/conversation |
| 1 000 conversations/mois | **~1-2 €** de coût API |

---

## 🛠️ Personnalisation

### Modifier un prompt métier
Éditer `netlify/functions/chat.js` → section `SYSTEM_PROMPTS`.

### Ajouter un établissement
1. Ajouter dans `SYSTEM_PROMPTS` dans `chat.js`
2. Ajouter dans le tableau `BUSINESSES` dans `index.html`

### Changer le modèle
Dans `chat.js`, ligne `model: 'claude-haiku-4-5'` :
- `claude-haiku-4-5` → rapide, économique ✅ (recommandé)
- `claude-sonnet-4-6` → plus intelligent, 5x plus cher

### Ajuster le rate limiting
Dans `chat.js` :
```js
const RATE_WINDOW_MS = 60_000; // fenêtre en ms
const RATE_LIMIT     = 15;     // requêtes max par fenêtre
```

---

## 🧪 Tester en local

```bash
npm install
npm run dev   # Lance netlify dev sur localhost:8888
```

> Nécessite [Netlify CLI](https://docs.netlify.com/cli/get-started/) et la variable `ANTHROPIC_API_KEY` dans un fichier `.env`.

---

**Agency IA Millau** · Construit avec ❤️ pour les PME aveyronnaises
