-- Legacy migration 0001 backfilled every user with can_create_organization = true, which bypassed
-- the free-tier owned-workspace cap. Reset to false; ops / invites / team checkout set it explicitly.
UPDATE "user" SET "can_create_organization" = false WHERE "can_create_organization" = true;
