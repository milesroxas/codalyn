ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscription_status" text;--> statement-breakpoint
CREATE TABLE "tower_usage_month" (
	"user_id" text NOT NULL,
	"year_month" text NOT NULL,
	"webflow_request_count" integer DEFAULT 0 NOT NULL,
	"image_optimize_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tower_usage_month_user_ym" UNIQUE("user_id","year_month")
);
--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD CONSTRAINT "tower_usage_month_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
