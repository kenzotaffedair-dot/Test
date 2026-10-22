CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY,
	"business_id" text NOT NULL,
	"helpful" boolean NOT NULL,
	"question" text,
	"answer" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"date" text,
	"guests" integer,
	"message" text,
	"created_at" timestamp DEFAULT now()
);
