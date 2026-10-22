// ═══════════════════════════════════════════════════════════════════════════
// 👍 / 👎 Avis sur les réponses de l'assistant
// ═══════════════════════════════════════════════════════════════════════════
import type { Config, Context } from '@netlify/functions';
import { db } from '../../db/index.js';
import { feedback } from '../../db/schema.js';
import { isKnownBusiness, checkRateLimit, clientIp } from '../../lib/businesses.js';

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Méthode non autorisée' }, { status: 405 });
  }

  const rl = checkRateLimit(`feedback:${clientIp(req, context)}`, 30);
  if (!rl.allowed) {
    return Response.json({ error: 'Trop de requêtes.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
  }

  const answer = typeof body?.answer === 'string' ? body.answer.trim().slice(0, 4000) : '';
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 800) : null;

  if (!isKnownBusiness(body?.businessId) || typeof body?.helpful !== 'boolean' || !answer) {
    return Response.json({ error: 'Avis invalide' }, { status: 400 });
  }

  try {
    await db.insert(feedback).values({
      businessId: body.businessId,
      helpful: body.helpful,
      question,
      answer,
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[feedback:error]', (err as Error)?.message);
    return Response.json({ error: 'Impossible d\'enregistrer l\'avis.' }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/feedback',
};
