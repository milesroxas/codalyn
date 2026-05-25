ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "metering_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "webflow_request_limit_override" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image_optimize_limit_override" integer;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "metering_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "webflow_request_limit_override" integer;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "image_optimize_limit_override" integer;
