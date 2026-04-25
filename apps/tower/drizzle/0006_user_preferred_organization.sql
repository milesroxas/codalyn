ALTER TABLE "user" ADD COLUMN "preferred_organization_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_preferred_organization_id_organization_id_fk" FOREIGN KEY ("preferred_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
