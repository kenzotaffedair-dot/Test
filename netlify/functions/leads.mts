// ═══════════════════════════════════════════════════════════════════════════
// 📅 Demandes de réservation / rappel envoyées depuis le chat
// ═══════════════════════════════════════════════════════════════════════════
import type { Config, Context } from '@netlify/functions';
import { db } from '../../db/index.js';
import { leads } from '../../db/schema.js';
import { isKnownBusiness, checkRateLimit, clientIp } from '../../lib/businesses.js';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Méthode non autorisée' }, { status: 405 });
  }

  const rl = checkRateLimit(`leads:${clientIp(req, context)}`, 5);
  if (!rl.allowed) {
    return Response.json({ error: `Trop de demandes. Réessayez dans ${rl.retryAfter} secondes.` }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
  }

  // Champ piège anti-spam : rempli uniquement par les robots
  if (body?.website) return Response.json({ ok: true }, { status: 201 });

  const name = str(body?.name, 100);
  const contact = str(body?.contact, 150);
  const date = str(body?.date, 40) || null;
  const message = str(body?.message, 1000) || null;
  const guestsNum = Number.parseInt(body?.guests, 10);
  const guests = Number.isFinite(guestsNum) && guestsNum > 0 && guestsNum < 500 ? guestsNum : null;

  if (!isKnownBusiness(body?.businessId)) {
    return Response.json({ error: 'Établissement inconnu' }, { status: 400 });
  }
  if (name.length < 2) {
    return Response.json({ error: 'Merci d\'indiquer votre nom.' }, { status: 400 });
  }
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^[+\d][\d\s.\-()]{7,}$/.test(contact);
  if (!isEmail && !isPhone) {
    return Response.json({ error: 'Merci d\'indiquer un e-mail ou un téléphone valide.' }, { status: 400 });
  }

  try {
    const [lead] = await db
      .insert(leads)
      .values({ businessId: body.businessId, name, contact, date, guests, message })
      .returning({ id: leads.id });

    return Response.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error('[leads:error]', (err as Error)?.message);
    return Response.json({ error: 'Impossible d\'enregistrer la demande. Réessayez.' }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/leads',
};
