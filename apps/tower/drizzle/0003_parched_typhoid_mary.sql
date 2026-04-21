ALTER TABLE "member" ADD COLUMN "beacon_restrict_to_editor_experience" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "beacon_team_settings" jsonb;