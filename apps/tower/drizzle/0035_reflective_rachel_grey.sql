CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"count" integer,
	"last_request" bigint,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tower_operator_invite_redemption" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"redeemed_by_user_id" text,
	"redeemed_at" timestamp DEFAULT now() NOT NULL
);
