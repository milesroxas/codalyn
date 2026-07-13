import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."pages_blocks_section_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_section_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_section_header" ADD CONSTRAINT "pages_blocks_section_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_section_header" ADD CONSTRAINT "_pages_v_blocks_section_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_section_header_order_idx" ON "payload"."pages_blocks_section_header" USING btree ("_order");
  CREATE INDEX "pages_blocks_section_header_parent_id_idx" ON "payload"."pages_blocks_section_header" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_section_header_path_idx" ON "payload"."pages_blocks_section_header" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_section_header_order_idx" ON "payload"."_pages_v_blocks_section_header" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_section_header_parent_id_idx" ON "payload"."_pages_v_blocks_section_header" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_section_header_path_idx" ON "payload"."_pages_v_blocks_section_header" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_section_header" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_section_header" CASCADE;`)
}
