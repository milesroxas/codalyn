ALTER TABLE "user" ADD COLUMN "can_create_organization" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "user" SET "can_create_organization" = true;