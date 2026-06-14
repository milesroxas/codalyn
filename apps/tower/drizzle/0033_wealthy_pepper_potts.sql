CREATE TABLE "flint_app_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"rule_config" jsonb,
	"custom_presets" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "flint_restrict_to_editor_experience" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "flint_team_settings" jsonb;--> statement-breakpoint
ALTER TABLE "flint_app_settings" ADD CONSTRAINT "flint_app_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;