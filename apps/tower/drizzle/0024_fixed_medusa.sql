CREATE TABLE "workspace_member_departure" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"member_id" text,
	"user_email" text NOT NULL,
	"user_name" text,
	"role" text NOT NULL,
	"departed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_member_departure" ADD CONSTRAINT "workspace_member_departure_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_departure" ADD CONSTRAINT "workspace_member_departure_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_member_departure_organization_id_idx" ON "workspace_member_departure" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspace_member_departure_departed_at_idx" ON "workspace_member_departure" USING btree ("departed_at");