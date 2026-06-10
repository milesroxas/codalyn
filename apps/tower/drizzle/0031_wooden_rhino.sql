CREATE TABLE "flint_beta_group_request" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"operator_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" text,
	CONSTRAINT "flint_beta_group_request_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "flint_beta_group_request" ADD CONSTRAINT "flint_beta_group_request_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flint_beta_group_request_status_idx" ON "flint_beta_group_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "flint_beta_group_request_created_at_idx" ON "flint_beta_group_request" USING btree ("created_at");