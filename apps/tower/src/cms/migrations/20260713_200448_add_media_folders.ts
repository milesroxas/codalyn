import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_payload_folders_folder_type" AS ENUM('media');
  CREATE TABLE "payload"."payload_folders_folder_type" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_payload_folders_folder_type",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."payload_folders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"folder_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."media" ADD COLUMN "folder_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "payload_folders_id" integer;
  ALTER TABLE "payload"."payload_folders_folder_type" ADD CONSTRAINT "payload_folders_folder_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_folders" ADD CONSTRAINT "payload_folders_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "payload"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_folders_folder_type_order_idx" ON "payload"."payload_folders_folder_type" USING btree ("order");
  CREATE INDEX "payload_folders_folder_type_parent_idx" ON "payload"."payload_folders_folder_type" USING btree ("parent_id");
  CREATE INDEX "payload_folders_name_idx" ON "payload"."payload_folders" USING btree ("name");
  CREATE INDEX "payload_folders_folder_idx" ON "payload"."payload_folders" USING btree ("folder_id");
  CREATE INDEX "payload_folders_updated_at_idx" ON "payload"."payload_folders" USING btree ("updated_at");
  CREATE INDEX "payload_folders_created_at_idx" ON "payload"."payload_folders" USING btree ("created_at");
  ALTER TABLE "payload"."media" ADD CONSTRAINT "media_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "payload"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_folders_fk" FOREIGN KEY ("payload_folders_id") REFERENCES "payload"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_folder_idx" ON "payload"."media" USING btree ("folder_id");
  CREATE INDEX "payload_locked_documents_rels_payload_folders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payload_folders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."payload_folders_folder_type" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payload_folders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."payload_folders_folder_type" CASCADE;
  DROP TABLE "payload"."payload_folders" CASCADE;
  ALTER TABLE "payload"."media" DROP CONSTRAINT "media_folder_id_payload_folders_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payload_folders_fk";
  
  DROP INDEX "payload"."media_folder_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_payload_folders_id_idx";
  ALTER TABLE "payload"."media" DROP COLUMN "folder_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "payload_folders_id";
  DROP TYPE "payload"."enum_payload_folders_folder_type";`)
}
