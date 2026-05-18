CREATE TABLE "organization_webflow_oauth_token" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_webflow_oauth_token" ADD CONSTRAINT "organization_webflow_oauth_token_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "organization_webflow_oauth_token" ("organization_id", "access_token", "refresh_token", "expires_at", "scope", "created_at", "updated_at")
SELECT DISTINCT ON (m."organization_id")
	m."organization_id",
	w."access_token",
	w."refresh_token",
	w."expires_at",
	w."scope",
	w."created_at",
	w."updated_at"
FROM "webflow_oauth_token" w
INNER JOIN "member" m ON m."user_id" = w."user_id" AND m."role" IN ('owner', 'admin')
ORDER BY m."organization_id", w."updated_at" DESC;--> statement-breakpoint
DELETE FROM "webflow_oauth_authorize_state";--> statement-breakpoint
ALTER TABLE "webflow_oauth_authorize_state" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webflow_oauth_authorize_state" ADD CONSTRAINT "webflow_oauth_authorize_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP TABLE "webflow_oauth_token";
