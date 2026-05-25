ALTER TABLE "tower_usage_month" RENAME COLUMN "webflow_request_count" TO "webflow_proxy_request_count";--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD COLUMN IF NOT EXISTS "cms_write_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "webflow_request_limit_override" TO "webflow_proxy_limit_override";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cms_write_limit_override" integer;--> statement-breakpoint
ALTER TABLE "organization" RENAME COLUMN "webflow_request_limit_override" TO "webflow_proxy_limit_override";--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "cms_write_limit_override" integer;--> statement-breakpoint
ALTER TABLE "tower_platform_metering" RENAME COLUMN "free_webflow_requests_per_month" TO "free_webflow_proxy_requests_per_month";--> statement-breakpoint
ALTER TABLE "tower_platform_metering" RENAME COLUMN "pro_webflow_requests_per_month" TO "pro_webflow_proxy_requests_per_month";--> statement-breakpoint
ALTER TABLE "tower_platform_metering" ADD COLUMN IF NOT EXISTS "free_cms_writes_per_month" integer;--> statement-breakpoint
ALTER TABLE "tower_platform_metering" ADD COLUMN IF NOT EXISTS "pro_cms_writes_per_month" integer;--> statement-breakpoint
UPDATE "tower_platform_metering" SET "free_cms_writes_per_month" = 500 WHERE "free_cms_writes_per_month" IS NULL;--> statement-breakpoint
UPDATE "tower_platform_metering" SET "pro_cms_writes_per_month" = 50000 WHERE "pro_cms_writes_per_month" IS NULL;--> statement-breakpoint
ALTER TABLE "tower_platform_metering" ALTER COLUMN "free_cms_writes_per_month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_platform_metering" ALTER COLUMN "pro_cms_writes_per_month" SET NOT NULL;
