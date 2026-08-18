CREATE TABLE "organization_webflow_site" (
	"organization_id" text NOT NULL,
	"app_key" text DEFAULT 'beacon' NOT NULL,
	"site_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_webflow_site_organization_id_app_key_site_id_pk" PRIMARY KEY("organization_id","app_key","site_id")
);
--> statement-breakpoint
ALTER TABLE "webflow_oauth_authorize_state" ADD COLUMN "webflow_authorized_user_id" text;--> statement-breakpoint
ALTER TABLE "organization_webflow_site" ADD CONSTRAINT "organization_webflow_site_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_webflow_site_app_site_idx" ON "organization_webflow_site" USING btree ("app_key","site_id");