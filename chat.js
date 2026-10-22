// ═══════════════════════════════════════════════════════════════════════════
// 🤖 Agent IA Millau — Backend Netlify Function
// Sécurisé : API key côté serveur, rate limiting, validation, CORS strict
// ═══════════════════════════════════════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');

// ─── Rate Limiting (in-memory, reset au cold start) ───────────────────────
const rateStore = new Map();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT     = 15;     // requêtes max par fenêtre par IP

function checkRateLimit(ip) {
  const now = Date.now();
  let rec = rateStore.get(ip);

  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + RATE_WINDOW_MS };
  }
  rec.count++;
  rateStore.set(ip, rec);

  // Nettoyage mémoire périodique
  if (rateStore.size > 1000) {
    for (const [k, v] of rateStore) {
      if (now > v.resetAt) rateStore.delete(k);
    }
  }

  return rec.count <= RATE_LIMIT
    ? { allowed: true }
    : { allowed: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
}

// ─── Prompts Métier (JAMAIS exposés au client) ─────────────────────────────
const SYSTEM_PROMPTS = {
  creissels: `Tu es l'assistant virtuel du Château de Creissels, hôtel-restaurant 4 étoiles dans un château médiéval du XIIe siècle à Millau (Aveyron).
INFOS CLÉS : 13 chambres et suites (80-250€/nuit) · Restaurant gastronomique (menu 35-75€) · Piscine, jardin, vue panoramique sur le Viaduc · Mariages, séminaires, week-ends romantiques · Cuisine du terroir aveyronais revisitée.
COMPORTEMENT : Sois élégant, chaleureux, professionnel. Valorise l'aspect historique et romantique. Propose systématiquement de réserver. Réponds en 3-4 phrases maximum. Commence par accueillir chaleureusement.`,

  fabre: `Tu es l'assistant de Maison Fabre, ganterie millavoise fondée en 1924. Manufacture française de gants en cuir de luxe, transmise sur 4 générations.
INFOS CLÉS : Cuirs pécari, agneau nappa, chevreau, soie · Prix 150€-600€ selon modèle · Sur-mesure 3-4 semaines (devis gratuit) · Boutique Millau + vente en ligne · Visite atelier sur RDV · Export 40 pays, clients maisons de couture.
COMPORTEMENT : Passionné, expert du cuir, soucieux de la qualité. Explique les matières et l'artisanat. Propose toujours le sur-mesure comme option premium. Réponds en 3-4 phrases précises et enthousiastes.`,

  paume: `Tu es l'assistant du restaurant Au Jeu de Paume, brasserie traditionnelle chaleureuse au cœur de Millau.
INFOS CLÉS : Menu du jour 14€ (entrée+plat+dessert, midi semaine) · Carte 25-40€ · Spécialités : aligot, tripoux, côte de bœuf Aubrac, plateau fromages AOP · Terrasse 40 couverts en été · Ouvert 7j/7 midi et soir (fermé lundi soir) · Réservation conseillée vendredi/samedi.
COMPORTEMENT : Convivial, accueillant, authentique. Décris les plats avec gourmandise. Propose de réserver une table. Réponds en 3-4 phrases courtes et chaleureuses.`,

  aventures: `Tu es l'assistant de Millau Aventures, prestataire d'activités outdoor dans le Sud Aveyron.
INFOS CLÉS : Via ferrata, escalade, canyoning, VTT, randonnées guidées · Gorges du Tarn, Gorges de la Dourbie, Causse du Larzac · 35€-85€/personne · Groupes 4-20 personnes, familles bienvenues · Guide d'État breveté, équipement fourni · Réservation 48h à l'avance · Saison : avril-octobre.
COMPORTEMENT : Dynamique, enthousiaste ! Rassure les débutants sur la sécurité. Suggère l'activité selon le profil (famille/sportif/débutant). Encourage à réserver vite (places limitées). 3-4 phrases énergiques.`,

  fromagerie: `Tu es l'assistant de la Fromagerie des Causses, producteur et affineur artisanal de fromages à Millau.
INFOS CLÉS : Roquefort AOP, Bleu des Causses AOP, Pérail, Tome fraîche, Brebis frais · Lait de producteurs aveyronnais locaux · Boutique Millau + livraison France (colis réfrigéré 24-48h) · Plateaux événements à partir de 8€/pers · Visite cave d'affinage sur RDV · Prix 5€-35€.
COMPORTEMENT : Expert fromager passionné et pédagogue. Explique les AOP, affinages et terroirs. Propose des accords mets-vins. Encourage à commander ou visiter. 3-4 phrases gourmandes et précises.`,

  gites: `Tu es l'assistant des Gîtes du Viaduc, location de gîtes et chambres d'hôtes avec vue directe sur le Viaduc de Millau.
INFOS CLÉS : 6 gîtes de 2 à 10 personnes (200-800€/semaine en saison) · 3 chambres d'hôtes (75-110€/nuit, petit-déjeuner inclus) · Vue panoramique sur le Viaduc · Piscine commune, barbecue, jardin paysager · Minimum 2 nuits week-end · Animaux acceptés sur demande (+15€/séjour).
COMPORTEMENT : Chaleureux comme un hôte qui accueille chez lui. Mets en avant la vue unique sur le Viaduc. Demande toujours les dates et le nombre de personnes. 3-4 phrases accueillantes et descriptives.`,

  default: `Tu es un assistant virtuel pour un commerce de Millau (Aveyron). Sois professionnel, aimable et aide le client du mieux possible. Réponds en 3-4 phrases maximum, en français.`
};

// ─── CORS (strict en production) ──────────────────────────────────────────
function buildCorsHeaders(origin) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const originOk = allowed.length === 0 || allowed.includes(origin);

  return {
    'Access-Control-Allow-Origin'  : originOk ? (origin || '*') : allowed[0] || '*',
    'Access-Control-Allow-Methods' : 'POST, OPTIONS',
    'Access-Control-Allow-Headers' : 'Content-Type',
    'Access-Control-Max-Age'       : '86400',
  };
}

// ─── Réponse JSON helper ───────────────────────────────────────────────────
function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  };
}

// ─── Handler principal ─────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin  = event.headers?.origin || '';
  const cors    = buildCorsHeaders(origin);

  // ── Preflight OPTIONS ────────────────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  // ── Méthode ──────────────────────────────────────────────────────────────
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Méthode non autorisée' }, cors);
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = (event.headers?.['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim().slice(0, 45); // Limite longueur pour sécurité

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return jsonResponse(429,
      { error: `Trop de requêtes. Réessayez dans ${rl.retryAfter} secondes.` },
      { ...cors, 'Retry-After': String(rl.retryAfter) }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Corps de requête JSON invalide' }, cors);
  }

  const { messages, businessId } = body;

  // ── Validation messages ───────────────────────────────────────────────────
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse(400, { error: 'Le champ "messages" est requis (tableau non vide)' }, cors);
  }
  if (messages.length > 30) {
    return jsonResponse(400, { error: 'Historique trop long (max 30 messages)' }, cors);
  }

  // ── Sanitisation ──────────────────────────────────────────────────────────
  const cleanMessages = messages
    .slice(-10) // Garde les 10 derniers seulement
    .filter(m =>
      m &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0 &&
      ['user', 'assistant'].includes(m.role)
    )
    .map(m => ({
      role   : m.role,
      content: m.content.trim().slice(0, 800), // Max 800 chars/message
    }));

  if (cleanMessages.length === 0) {
    return jsonResponse(400, { error: 'Aucun message valide trouvé' }, cors);
  }

  // Anthropic exige que le premier message soit "user"
  if (cleanMessages[0].role !== 'user') {
    return jsonResponse(400, { error: 'Le premier message doit venir du client' }, cors);
  }

  // ── Appel Anthropic API ───────────────────────────────────────────────────
  const systemPrompt = SYSTEM_PROMPTS[String(businessId || 'default')] || SYSTEM_PROMPTS.default;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model     : 'claude-haiku-4-5', // Rapide + économique pour les chatbots
      max_tokens: 450,
      system    : systemPrompt,
      messages  : cleanMessages,
    });

    const reply = response.content?.[0]?.text ?? 'Je n\'ai pas pu générer de réponse.';

    return jsonResponse(200, {
      reply,
      usage: {
        tokensIn : response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      },
    }, cors);

  } catch (err) {
    // Log structuré (sans données sensibles)
    console.error('[chat:error]', JSON.stringify({
      status    : err.status,
      type      : err.error?.type,
      businessId: businessId || 'unknown',
      messages  : cleanMessages.length,
    }));

    // Erreurs spécifiques Anthropic
    if (err.status === 401) return jsonResponse(500, { error: 'Erreur de configuration serveur' }, cors);
    if (err.status === 429) return jsonResponse(429, { error: 'Quota API atteint. Réessayez dans quelques instants.' }, cors);
    if (err.status === 529 || err.status === 503) return jsonResponse(503, { error: 'Service momentanément indisponible.' }, cors);

    return jsonResponse(500, { error: 'Erreur serveur inattendue. Réessayez.' }, cors);
  }
};
