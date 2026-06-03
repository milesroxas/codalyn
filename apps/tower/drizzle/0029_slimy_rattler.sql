ALTER TABLE "tower_usage_month" ADD COLUMN "webflow_proxy_compute_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD COLUMN "webflow_proxy_egress_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD COLUMN "cms_write_compute_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD COLUMN "cms_write_egress_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD COLUMN "image_compute_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_usage_month" ADD COLUMN "image_egress_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD COLUMN "webflow_proxy_compute_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD COLUMN "webflow_proxy_egress_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD COLUMN "cms_write_compute_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD COLUMN "cms_write_egress_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD COLUMN "image_compute_ms" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD COLUMN "image_egress_bytes" bigint DEFAULT 0 NOT NULL;