import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

// Demandes de réservation / contact envoyées depuis le chat
export const leads = pgTable("leads", {
  id: serial().primaryKey(),
  businessId: text("business_id").notNull(),
  name: text().notNull(),
  contact: text().notNull(),
  date: text(),
  guests: integer(),
  message: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Avis 👍 / 👎 laissés sur les réponses de l'assistant
export const feedback = pgTable("feedback", {
  id: serial().primaryKey(),
  businessId: text("business_id").notNull(),
  helpful: boolean().notNull(),
  question: text(),
  answer: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
