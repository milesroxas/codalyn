CREATE TABLE "webflow_oauth_install_code" (
	"id" text PRIMARY KEY NOT NULL,
	"authorization_code" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"external_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
