-- Per-app Webflow OAuth tokens: add app_key and switch the token PK to (organization_id, app_key)
-- so Beacon and Flint tokens can coexist per workspace. Existing rows default to 'beacon'.
ALTER TABLE "organization_webflow_oauth_token" ADD COLUMN "app_key" text DEFAULT 'beacon' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_webflow_oauth_token" DROP CONSTRAINT "organization_webflow_oauth_token_pkey";--> statement-breakpoint
ALTER TABLE "organization_webflow_oauth_token" ADD CONSTRAINT "organization_webflow_oauth_token_organization_id_app_key_pk" PRIMARY KEY("organization_id","app_key");--> statement-breakpoint
ALTER TABLE "webflow_oauth_authorize_state" ADD COLUMN "app_key" text DEFAULT 'beacon' NOT NULL;--> statement-breakpoint
ALTER TABLE "webflow_oauth_install_code" ADD COLUMN "app_key" text DEFAULT 'beacon' NOT NULL;
