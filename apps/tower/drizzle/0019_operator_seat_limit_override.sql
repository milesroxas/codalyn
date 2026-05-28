ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "operator_seat_limit_override" boolean DEFAULT false NOT NULL;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "stripe_seat_quantity" integer;
