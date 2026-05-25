CREATE TABLE IF NOT EXISTS "tower_platform_metering" (
	"id" text PRIMARY KEY NOT NULL,
	"global_metering_enabled" boolean DEFAULT true NOT NULL,
	"free_webflow_requests_per_month" integer NOT NULL,
	"free_image_optimizes_per_month" integer NOT NULL,
	"pro_webflow_requests_per_month" integer NOT NULL,
	"pro_image_optimizes_per_month" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
