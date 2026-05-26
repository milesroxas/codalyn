CREATE TABLE IF NOT EXISTS "tower_destructive_action_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"attempt_count" integer NOT NULL
);
