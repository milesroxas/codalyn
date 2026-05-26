CREATE TABLE "support_request" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"topic" text NOT NULL,
	"details" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"operator_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" text
);
--> statement-breakpoint
ALTER TABLE "support_request" ADD CONSTRAINT "support_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_request" ADD CONSTRAINT "support_request_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_request_status_idx" ON "support_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_request_kind_idx" ON "support_request" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "support_request_created_at_idx" ON "support_request" USING btree ("created_at");
