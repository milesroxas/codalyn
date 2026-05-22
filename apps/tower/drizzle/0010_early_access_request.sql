CREATE TABLE "early_access_request" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" text,
	CONSTRAINT "early_access_request_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "early_access_request" ADD CONSTRAINT "early_access_request_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "early_access_request_status_idx" ON "early_access_request" USING btree ("status");
