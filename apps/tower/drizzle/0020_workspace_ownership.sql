ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "owner_user_id" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "billing_owner_user_id" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "purge_scheduled_at" timestamp;

UPDATE "organization" AS o
SET "owner_user_id" = sub.user_id
FROM (
  SELECT DISTINCT ON (m.organization_id)
    m.organization_id,
    m.user_id
  FROM "member" AS m
  WHERE m.role IN ('admin', 'owner')
  ORDER BY m.organization_id, CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END, m.created_at ASC
) AS sub
WHERE o.id = sub.organization_id
  AND o.owner_user_id IS NULL;

UPDATE "organization" AS o
SET "billing_owner_user_id" = o.owner_user_id
WHERE o.billing_owner_user_id IS NULL
  AND o.owner_user_id IS NOT NULL
  AND o.stripe_subscription_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "organization" WHERE owner_user_id IS NULL) THEN
    RAISE EXCEPTION 'organization.owner_user_id backfill incomplete';
  END IF;
END $$;

ALTER TABLE "organization" ALTER COLUMN "owner_user_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_owner_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "organization"
      ADD CONSTRAINT "organization_owner_user_id_user_id_fk"
      FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_billing_owner_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "organization"
      ADD CONSTRAINT "organization_billing_owner_user_id_user_id_fk"
      FOREIGN KEY ("billing_owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "organization_owner_user_id_idx" ON "organization" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "organization_billing_owner_user_id_idx" ON "organization" ("billing_owner_user_id");
CREATE INDEX IF NOT EXISTS "organization_deleted_at_idx" ON "organization" ("deleted_at");

CREATE TABLE IF NOT EXISTS "workspace_ownership_transfer" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "from_user_id" text NOT NULL,
  "to_user_id" text NOT NULL,
  "status" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "requires_billing_acceptance" boolean DEFAULT false NOT NULL,
  "stripe_billing_ready" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfer_organization_id_organization_id_fk'
  ) THEN
    ALTER TABLE "workspace_ownership_transfer"
      ADD CONSTRAINT "workspace_ownership_transfer_organization_id_organization_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfer_from_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "workspace_ownership_transfer"
      ADD CONSTRAINT "workspace_ownership_transfer_from_user_id_user_id_fk"
      FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_ownership_transfer_to_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "workspace_ownership_transfer"
      ADD CONSTRAINT "workspace_ownership_transfer_to_user_id_user_id_fk"
      FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "workspace_ownership_transfer_organization_id_idx" ON "workspace_ownership_transfer" ("organization_id");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfer_to_user_id_idx" ON "workspace_ownership_transfer" ("to_user_id");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfer_from_user_id_idx" ON "workspace_ownership_transfer" ("from_user_id");
CREATE INDEX IF NOT EXISTS "workspace_ownership_transfer_status_idx" ON "workspace_ownership_transfer" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_ownership_transfer_pending_org_unique"
  ON "workspace_ownership_transfer" ("organization_id")
  WHERE "status" = 'pending';
