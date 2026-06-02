CREATE TABLE "tower_workspace_usage_month" (
	"organization_id" text NOT NULL,
	"year_month" text NOT NULL,
	"webflow_proxy_request_count" integer DEFAULT 0 NOT NULL,
	"webflow_proxy_cms_slots_count" integer DEFAULT 0 NOT NULL,
	"webflow_proxy_image_upload_cms_count" integer DEFAULT 0 NOT NULL,
	"cms_write_count" integer DEFAULT 0 NOT NULL,
	"image_optimize_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tower_workspace_usage_month" ADD CONSTRAINT "tower_workspace_usage_month_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tower_workspace_usage_month_org_ym" ON "tower_workspace_usage_month" USING btree ("organization_id","year_month");