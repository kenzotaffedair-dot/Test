// ═══════════════════════════════════════════════════════════════════════════
// 🤖 Agent IA Millau — Chat (streaming) via Netlify AI Gateway
// ═══════════════════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import type { Config, Context } from '@netlify/functions';
import { getSystemPrompt, checkRateLimit, clientIp } from '../../lib/businesses.js';

const MODEL = 'claude-haiku-5-5'; // Rapide + économique pour les chatbots

const anthropic = new Anthropic();

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Méthode non autorisée' }, { status: 405 });
  }

  const rl = checkRateLimit(`chat:${clientIp(req, context)}`);
  if (!rl.allowed) {
    return Response.json(
      { error: `Trop de requêtes. Réessayez dans ${rl.retryAfter} secondes.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
  }

  const { messages, businessId } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Le champ "messages" est requis (tableau non vide)' }, { status: 400 });
  }
  if (messages.length > 30) {
    return Response.json({ error: 'Historique trop long (max 30 messages)' }, { status: 400 });
  }

  // ── Sanitisation : 12 derniers messages, 800 caractères max ───────────────
  const cleanMessages: ChatMessage[] = messages
    .slice(-12)
    .filter((m: any) =>
      m && typeof m.content === 'string' && m.content.trim().length > 0 &&
      ['user', 'assistant'].includes(m.role))
    .map((m: any) => ({ role: m.role, content: m.content.trim().slice(0, 800) }));

  // Anthropic exige que la conversation commence par un message "user"
  while (cleanMessages.length && cleanMessages[0].role !== 'user') cleanMessages.shift();

  if (cleanMessages.length === 0) {
    return Response.json({ error: 'Aucun message valide trouvé' }, { status: 400 });
  }

  let stream;
  try {
    stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: getSystemPrompt(businessId),
      messages: cleanMessages,
      stream: true,
    });
  } catch (err: any) {
    console.error('[chat:error]', JSON.stringify({ status: err?.status, businessId: businessId || 'unknown' }));
    if (err?.status === 429) return Response.json({ error: 'Quota IA atteint. Réessayez dans quelques instants.' }, { status: 429 });
    if (err?.status === 529 || err?.status === 503) return Response.json({ error: 'Service momentanément indisponible.' }, { status: 503 });
    return Response.json({ error: 'Erreur serveur inattendue. Réessayez.' }, { status: 500 });
  }

  // ── Réponse en flux texte brut (affichage progressif côté client) ─────────
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err: any) {
        console.error('[chat:stream-error]', JSON.stringify({ status: err?.status }));
        controller.enqueue(encoder.encode('\n\n⚠️ La réponse a été interrompue. Réessayez.'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};

export const config: Config = {
  path: '/api/chat',
};
