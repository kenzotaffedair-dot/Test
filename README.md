# 🤖 Chatbot IA Millau — v2

**Assistant virtuel configurable** pour les commerces de Millau (Aveyron).  
Propulsé par Claude AI (Anthropic) · Déploiement Netlify en 5 min.

---

## 📁 Structure du projet

```
millau-chatbot/
├── index.html                   # Frontend (UI, streaming, historique, réservation)
├── netlify.toml                 # Config Netlify + headers sécurité
├── package.json                 # Dépendances Node.js
├── lib/businesses.ts            # Prompts métier + rate limiting (côté serveur)
├── db/                          # Schéma Drizzle (Netlify Database)
└── netlify/
    ├── database/migrations/     # Migrations SQL appliquées au déploiement
    └── functions/
        ├── chat.mts             # /api/chat — réponses IA en streaming
        ├── leads.mts            # /api/leads — demandes de réservation / rappel
        └── feedback.mts         # /api/feedback — avis 👍 / 👎
```

---

## 🚀 Déploiement Netlify — 5 étapes

### 1. Créer un dépôt GitHub
Uploader tous les fichiers de ce dossier sur GitHub.

### 2. Connecter à Netlify
→ [netlify.com](https://netlify.com) → **"Add new site"** → **"Import from Git"**  
Sélectionner votre repo GitHub.

### 3. Aucune clé API nécessaire
Les appels IA passent par **Netlify AI Gateway** : les identifiants sont injectés automatiquement.
La base de données (Netlify Database) est créée et migrée automatiquement au déploiement.

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
- ✅ **Même origine uniquement** — le frontend et l'API sont servis par le même domaine
- ✅ **Anti-spam** — champ piège + rate limiting sur le formulaire de réservation
- ✅ **Headers sécurité** — CSP, X-Frame-Options, XSS-Protection
- ✅ **Logs sans données sensibles** — les prompts ne sont pas loggés

---

## ✨ Fonctionnalités

- 💬 Réponses IA affichées en direct (streaming)
- 💾 Conversation sauvegardée dans le navigateur, reprise automatique, bouton « Effacer »
- ✍️ Mise en forme des réponses (gras, listes)
- 📋 Copier une réponse · 👍 / 👎 pour noter les réponses (enregistré en base)
- 📅 Formulaire « Réserver / Être rappelé » : les demandes sont enregistrées dans la table `leads`
- 🔎 Recherche parmi les établissements

---

## 💰 Coût estimé

| Composant | Coût |
|-----------|------|
| Netlify Starter | **Gratuit** (125k req functions/mois) |
| Claude Haiku 5.5 (AI Gateway) | ~0,001 €/conversation |
| 1 000 conversations/mois | **~1-2 €** de coût API |

---

## 🛠️ Personnalisation

### Modifier un prompt métier
Éditer `lib/businesses.ts` → section `SYSTEM_PROMPTS`.

### Ajouter un établissement
1. Ajouter dans `SYSTEM_PROMPTS` dans `lib/businesses.ts`
2. Ajouter dans le tableau `BUSINESSES` dans `index.html`

### Changer le modèle
Dans `netlify/functions/chat.mts`, constante `MODEL` :
- `claude-haiku-5-5` → rapide, économique ✅ (recommandé)
- `claude-sonnet-5-5` → plus intelligent, plus cher

### Ajuster le rate limiting
Dans `lib/businesses.ts`, fonction `checkRateLimit(key, limit = 15, windowMs = 60_000)`.

---

## 🧪 Tester en local

```bash
npm install
npm run dev   # Lance netlify dev sur localhost:8888
```

> Nécessite [Netlify CLI](https://docs.netlify.com/cli/get-started/) et un site lié (`netlify link`) pour utiliser AI Gateway en local.

---

**Agency IA Millau** · Construit avec ❤️ pour les PME aveyronnaises
