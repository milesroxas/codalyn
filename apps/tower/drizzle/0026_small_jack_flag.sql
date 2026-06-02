ALTER TABLE "tower_platform_metering" ADD COLUMN "studio_webflow_proxy_requests_per_month" integer DEFAULT 60000 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_platform_metering" ADD COLUMN "studio_cms_writes_per_month" integer DEFAULT 12000 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_platform_metering" ADD COLUMN "studio_image_optimizes_per_month" integer DEFAULT 3000 NOT NULL;