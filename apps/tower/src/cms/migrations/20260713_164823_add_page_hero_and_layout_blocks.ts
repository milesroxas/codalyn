import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_hero_actions_appearance" AS ENUM('primary', 'secondary');
  CREATE TYPE "payload"."enum_pages_hero_variant" AS ENUM('center', 'none');
  CREATE TYPE "payload"."enum__pages_v_version_hero_actions_appearance" AS ENUM('primary', 'secondary');
  CREATE TYPE "payload"."enum__pages_v_version_hero_variant" AS ENUM('center', 'none');
  CREATE TABLE "payload"."pages_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"appearance" "payload"."enum_pages_hero_actions_appearance" DEFAULT 'primary'
  );
  
  CREATE TABLE "payload"."pages_blocks_two_col_list_left_columns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_two_col_list_left_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_two_col_list_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_version_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"appearance" "payload"."enum__pages_v_version_hero_actions_appearance" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_two_col_list_left_columns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_two_col_list_left_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_two_col_list_left" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages" ADD COLUMN "hero_variant" "payload"."enum_pages_hero_variant" DEFAULT 'center';
  ALTER TABLE "payload"."pages" ADD COLUMN "hero_eyebrow" varchar;
  ALTER TABLE "payload"."_pages_v" ADD COLUMN "version_hero_variant" "payload"."enum__pages_v_version_hero_variant" DEFAULT 'center';
  ALTER TABLE "payload"."_pages_v" ADD COLUMN "version_hero_eyebrow" varchar;
  ALTER TABLE "payload"."pages_hero_actions" ADD CONSTRAINT "pages_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_two_col_list_left_columns_items" ADD CONSTRAINT "pages_blocks_two_col_list_left_columns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_two_col_list_left_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_two_col_list_left_columns" ADD CONSTRAINT "pages_blocks_two_col_list_left_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_two_col_list_left"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_two_col_list_left" ADD CONSTRAINT "pages_blocks_two_col_list_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_content" ADD CONSTRAINT "pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_hero_actions" ADD CONSTRAINT "_pages_v_version_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_two_col_list_left_columns_items" ADD CONSTRAINT "_pages_v_blocks_two_col_list_left_columns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_two_col_list_left_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_two_col_list_left_columns" ADD CONSTRAINT "_pages_v_blocks_two_col_list_left_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_two_col_list_left"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_two_col_list_left" ADD CONSTRAINT "_pages_v_blocks_two_col_list_left_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_content" ADD CONSTRAINT "_pages_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_hero_actions_order_idx" ON "payload"."pages_hero_actions" USING btree ("_order");
  CREATE INDEX "pages_hero_actions_parent_id_idx" ON "payload"."pages_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_two_col_list_left_columns_items_order_idx" ON "payload"."pages_blocks_two_col_list_left_columns_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_two_col_list_left_columns_items_parent_id_idx" ON "payload"."pages_blocks_two_col_list_left_columns_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_two_col_list_left_columns_order_idx" ON "payload"."pages_blocks_two_col_list_left_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_two_col_list_left_columns_parent_id_idx" ON "payload"."pages_blocks_two_col_list_left_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_two_col_list_left_order_idx" ON "payload"."pages_blocks_two_col_list_left" USING btree ("_order");
  CREATE INDEX "pages_blocks_two_col_list_left_parent_id_idx" ON "payload"."pages_blocks_two_col_list_left" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_two_col_list_left_path_idx" ON "payload"."pages_blocks_two_col_list_left" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_order_idx" ON "payload"."pages_blocks_media_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_block_parent_id_idx" ON "payload"."pages_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_block_path_idx" ON "payload"."pages_blocks_media_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_media_idx" ON "payload"."pages_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "pages_blocks_content_order_idx" ON "payload"."pages_blocks_content" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_parent_id_idx" ON "payload"."pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_path_idx" ON "payload"."pages_blocks_content" USING btree ("_path");
  CREATE INDEX "_pages_v_version_hero_actions_order_idx" ON "payload"."_pages_v_version_hero_actions" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hero_actions_parent_id_idx" ON "payload"."_pages_v_version_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_columns_items_order_idx" ON "payload"."_pages_v_blocks_two_col_list_left_columns_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_columns_items_parent_id_idx" ON "payload"."_pages_v_blocks_two_col_list_left_columns_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_columns_order_idx" ON "payload"."_pages_v_blocks_two_col_list_left_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_columns_parent_id_idx" ON "payload"."_pages_v_blocks_two_col_list_left_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_order_idx" ON "payload"."_pages_v_blocks_two_col_list_left" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_parent_id_idx" ON "payload"."_pages_v_blocks_two_col_list_left" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_two_col_list_left_path_idx" ON "payload"."_pages_v_blocks_two_col_list_left" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_order_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_block_parent_id_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_block_path_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_media_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_content_order_idx" ON "payload"."_pages_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_content_parent_id_idx" ON "payload"."_pages_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_content_path_idx" ON "payload"."_pages_v_blocks_content" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_hero_actions" CASCADE;
  DROP TABLE "payload"."pages_blocks_two_col_list_left_columns_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_two_col_list_left_columns" CASCADE;
  DROP TABLE "payload"."pages_blocks_two_col_list_left" CASCADE;
  DROP TABLE "payload"."pages_blocks_media_block" CASCADE;
  DROP TABLE "payload"."pages_blocks_content" CASCADE;
  DROP TABLE "payload"."_pages_v_version_hero_actions" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_two_col_list_left_columns_items" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_two_col_list_left_columns" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_two_col_list_left" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_media_block" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_content" CASCADE;
  ALTER TABLE "payload"."pages" DROP COLUMN "hero_variant";
  ALTER TABLE "payload"."pages" DROP COLUMN "hero_eyebrow";
  ALTER TABLE "payload"."_pages_v" DROP COLUMN "version_hero_variant";
  ALTER TABLE "payload"."_pages_v" DROP COLUMN "version_hero_eyebrow";
  DROP TYPE "payload"."enum_pages_hero_actions_appearance";
  DROP TYPE "payload"."enum_pages_hero_variant";
  DROP TYPE "payload"."enum__pages_v_version_hero_actions_appearance";
  DROP TYPE "payload"."enum__pages_v_version_hero_variant";`)
}
