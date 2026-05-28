ALTER TABLE "early_access_request" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "early_access_request" ADD COLUMN "last_name" text;--> statement-breakpoint
UPDATE "early_access_request"
SET
  "first_name" = CASE
    WHEN "name" IS NOT NULL AND btrim("name") <> '' THEN split_part(btrim("name"), ' ', 1)
    ELSE NULL
  END,
  "last_name" = CASE
    WHEN "name" IS NOT NULL AND position(' ' IN btrim("name")) > 0 THEN btrim(substring(btrim("name") FROM position(' ' IN btrim("name")) + 1))
    ELSE NULL
  END;--> statement-breakpoint
ALTER TABLE "early_access_request" DROP COLUMN "name";--> statement-breakpoint

