ALTER TABLE "tower_platform_metering" ADD COLUMN IF NOT EXISTS "team_webflow_proxy_requests_per_month" integer;
ALTER TABLE "tower_platform_metering" ADD COLUMN IF NOT EXISTS "team_cms_writes_per_month" integer;
ALTER TABLE "tower_platform_metering" ADD COLUMN IF NOT EXISTS "team_image_optimizes_per_month" integer;

UPDATE "tower_platform_metering"
SET
  "team_webflow_proxy_requests_per_month" = COALESCE("team_webflow_proxy_requests_per_month", "pro_webflow_proxy_requests_per_month"),
  "team_cms_writes_per_month" = COALESCE("team_cms_writes_per_month", "pro_cms_writes_per_month"),
  "team_image_optimizes_per_month" = COALESCE("team_image_optimizes_per_month", "pro_image_optimizes_per_month")
WHERE id = 'default';

ALTER TABLE "tower_platform_metering" ALTER COLUMN "team_webflow_proxy_requests_per_month" SET NOT NULL;
ALTER TABLE "tower_platform_metering" ALTER COLUMN "team_cms_writes_per_month" SET NOT NULL;
ALTER TABLE "tower_platform_metering" ALTER COLUMN "team_image_optimizes_per_month" SET NOT NULL;
