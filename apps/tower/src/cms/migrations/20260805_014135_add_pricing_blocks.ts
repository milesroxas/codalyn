import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_cta_band_actions_appearance" AS ENUM('primary', 'secondary');
  CREATE TYPE "payload"."enum__pages_v_blocks_cta_band_actions_appearance" AS ENUM('primary', 'secondary');
  CREATE TABLE "payload"."pages_blocks_pricing_plans_trust_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_pricing_plans_plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_pricing_plans_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price" varchar,
  	"price_suffix" varchar,
  	"badge" varchar,
  	"best_for" varchar,
  	"featured" boolean DEFAULT false,
  	"cta_label" varchar,
  	"cta_href" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_pricing_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_feature_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_feature_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_compare_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"accent" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."pages_blocks_compare_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"muted" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."pages_blocks_compare_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_compare_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_faq_section_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_faq_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"appearance" "payload"."enum_pages_blocks_cta_band_actions_appearance" DEFAULT 'primary'
  );
  
  CREATE TABLE "payload"."pages_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_pricing_plans_trust_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_pricing_plans_plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_pricing_plans_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price" varchar,
  	"price_suffix" varchar,
  	"badge" varchar,
  	"best_for" varchar,
  	"featured" boolean DEFAULT false,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_pricing_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_feature_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_feature_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_compare_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"accent" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_compare_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"muted" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_compare_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_compare_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"footnote" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_faq_section_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_faq_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"appearance" "payload"."enum__pages_v_blocks_cta_band_actions_appearance" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_pricing_plans_trust_items" ADD CONSTRAINT "pages_blocks_pricing_plans_trust_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_pricing_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_pricing_plans_plans_features" ADD CONSTRAINT "pages_blocks_pricing_plans_plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_pricing_plans_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_pricing_plans_plans" ADD CONSTRAINT "pages_blocks_pricing_plans_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_pricing_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_pricing_plans" ADD CONSTRAINT "pages_blocks_pricing_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_feature_strip_items" ADD CONSTRAINT "pages_blocks_feature_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_feature_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_feature_strip" ADD CONSTRAINT "pages_blocks_feature_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_compare_table_columns" ADD CONSTRAINT "pages_blocks_compare_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_compare_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_compare_table_rows_cells" ADD CONSTRAINT "pages_blocks_compare_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_compare_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_compare_table_rows" ADD CONSTRAINT "pages_blocks_compare_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_compare_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_compare_table" ADD CONSTRAINT "pages_blocks_compare_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_faq_section_items" ADD CONSTRAINT "pages_blocks_faq_section_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_faq_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_faq_section" ADD CONSTRAINT "pages_blocks_faq_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_cta_band_actions" ADD CONSTRAINT "pages_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_cta_band" ADD CONSTRAINT "pages_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_pricing_plans_trust_items" ADD CONSTRAINT "_pages_v_blocks_pricing_plans_trust_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_pricing_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_pricing_plans_plans_features" ADD CONSTRAINT "_pages_v_blocks_pricing_plans_plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_pricing_plans_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_pricing_plans_plans" ADD CONSTRAINT "_pages_v_blocks_pricing_plans_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_pricing_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_pricing_plans" ADD CONSTRAINT "_pages_v_blocks_pricing_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_feature_strip_items" ADD CONSTRAINT "_pages_v_blocks_feature_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_feature_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_feature_strip" ADD CONSTRAINT "_pages_v_blocks_feature_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_compare_table_columns" ADD CONSTRAINT "_pages_v_blocks_compare_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_compare_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_compare_table_rows_cells" ADD CONSTRAINT "_pages_v_blocks_compare_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_compare_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_compare_table_rows" ADD CONSTRAINT "_pages_v_blocks_compare_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_compare_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_compare_table" ADD CONSTRAINT "_pages_v_blocks_compare_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_faq_section_items" ADD CONSTRAINT "_pages_v_blocks_faq_section_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_faq_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_faq_section" ADD CONSTRAINT "_pages_v_blocks_faq_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_cta_band_actions" ADD CONSTRAINT "_pages_v_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_cta_band" ADD CONSTRAINT "_pages_v_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_pricing_plans_trust_items_order_idx" ON "payload"."pages_blocks_pricing_plans_trust_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_plans_trust_items_parent_id_idx" ON "payload"."pages_blocks_pricing_plans_trust_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_plans_plans_features_order_idx" ON "payload"."pages_blocks_pricing_plans_plans_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_plans_plans_features_parent_id_idx" ON "payload"."pages_blocks_pricing_plans_plans_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_plans_plans_order_idx" ON "payload"."pages_blocks_pricing_plans_plans" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_plans_plans_parent_id_idx" ON "payload"."pages_blocks_pricing_plans_plans" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_plans_order_idx" ON "payload"."pages_blocks_pricing_plans" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_plans_parent_id_idx" ON "payload"."pages_blocks_pricing_plans" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_plans_path_idx" ON "payload"."pages_blocks_pricing_plans" USING btree ("_path");
  CREATE INDEX "pages_blocks_feature_strip_items_order_idx" ON "payload"."pages_blocks_feature_strip_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_feature_strip_items_parent_id_idx" ON "payload"."pages_blocks_feature_strip_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_feature_strip_order_idx" ON "payload"."pages_blocks_feature_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_feature_strip_parent_id_idx" ON "payload"."pages_blocks_feature_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_feature_strip_path_idx" ON "payload"."pages_blocks_feature_strip" USING btree ("_path");
  CREATE INDEX "pages_blocks_compare_table_columns_order_idx" ON "payload"."pages_blocks_compare_table_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_compare_table_columns_parent_id_idx" ON "payload"."pages_blocks_compare_table_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_compare_table_rows_cells_order_idx" ON "payload"."pages_blocks_compare_table_rows_cells" USING btree ("_order");
  CREATE INDEX "pages_blocks_compare_table_rows_cells_parent_id_idx" ON "payload"."pages_blocks_compare_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_compare_table_rows_order_idx" ON "payload"."pages_blocks_compare_table_rows" USING btree ("_order");
  CREATE INDEX "pages_blocks_compare_table_rows_parent_id_idx" ON "payload"."pages_blocks_compare_table_rows" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_compare_table_order_idx" ON "payload"."pages_blocks_compare_table" USING btree ("_order");
  CREATE INDEX "pages_blocks_compare_table_parent_id_idx" ON "payload"."pages_blocks_compare_table" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_compare_table_path_idx" ON "payload"."pages_blocks_compare_table" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_section_items_order_idx" ON "payload"."pages_blocks_faq_section_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_section_items_parent_id_idx" ON "payload"."pages_blocks_faq_section_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_section_order_idx" ON "payload"."pages_blocks_faq_section" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_section_parent_id_idx" ON "payload"."pages_blocks_faq_section" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_section_path_idx" ON "payload"."pages_blocks_faq_section" USING btree ("_path");
  CREATE INDEX "pages_blocks_cta_band_actions_order_idx" ON "payload"."pages_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_band_actions_parent_id_idx" ON "payload"."pages_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_band_order_idx" ON "payload"."pages_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_band_parent_id_idx" ON "payload"."pages_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_band_path_idx" ON "payload"."pages_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_pricing_plans_trust_items_order_idx" ON "payload"."_pages_v_blocks_pricing_plans_trust_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_pricing_plans_trust_items_parent_id_idx" ON "payload"."_pages_v_blocks_pricing_plans_trust_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_pricing_plans_plans_features_order_idx" ON "payload"."_pages_v_blocks_pricing_plans_plans_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_pricing_plans_plans_features_parent_id_idx" ON "payload"."_pages_v_blocks_pricing_plans_plans_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_pricing_plans_plans_order_idx" ON "payload"."_pages_v_blocks_pricing_plans_plans" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_pricing_plans_plans_parent_id_idx" ON "payload"."_pages_v_blocks_pricing_plans_plans" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_pricing_plans_order_idx" ON "payload"."_pages_v_blocks_pricing_plans" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_pricing_plans_parent_id_idx" ON "payload"."_pages_v_blocks_pricing_plans" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_pricing_plans_path_idx" ON "payload"."_pages_v_blocks_pricing_plans" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_feature_strip_items_order_idx" ON "payload"."_pages_v_blocks_feature_strip_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_feature_strip_items_parent_id_idx" ON "payload"."_pages_v_blocks_feature_strip_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_feature_strip_order_idx" ON "payload"."_pages_v_blocks_feature_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_feature_strip_parent_id_idx" ON "payload"."_pages_v_blocks_feature_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_feature_strip_path_idx" ON "payload"."_pages_v_blocks_feature_strip" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_compare_table_columns_order_idx" ON "payload"."_pages_v_blocks_compare_table_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_compare_table_columns_parent_id_idx" ON "payload"."_pages_v_blocks_compare_table_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_compare_table_rows_cells_order_idx" ON "payload"."_pages_v_blocks_compare_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_compare_table_rows_cells_parent_id_idx" ON "payload"."_pages_v_blocks_compare_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_compare_table_rows_order_idx" ON "payload"."_pages_v_blocks_compare_table_rows" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_compare_table_rows_parent_id_idx" ON "payload"."_pages_v_blocks_compare_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_compare_table_order_idx" ON "payload"."_pages_v_blocks_compare_table" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_compare_table_parent_id_idx" ON "payload"."_pages_v_blocks_compare_table" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_compare_table_path_idx" ON "payload"."_pages_v_blocks_compare_table" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_section_items_order_idx" ON "payload"."_pages_v_blocks_faq_section_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_section_items_parent_id_idx" ON "payload"."_pages_v_blocks_faq_section_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_section_order_idx" ON "payload"."_pages_v_blocks_faq_section" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_section_parent_id_idx" ON "payload"."_pages_v_blocks_faq_section" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_section_path_idx" ON "payload"."_pages_v_blocks_faq_section" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cta_band_actions_order_idx" ON "payload"."_pages_v_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_band_actions_parent_id_idx" ON "payload"."_pages_v_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_band_order_idx" ON "payload"."_pages_v_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_band_parent_id_idx" ON "payload"."_pages_v_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_band_path_idx" ON "payload"."_pages_v_blocks_cta_band" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_pricing_plans_trust_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_pricing_plans_plans_features" CASCADE;
  DROP TABLE "payload"."pages_blocks_pricing_plans_plans" CASCADE;
  DROP TABLE "payload"."pages_blocks_pricing_plans" CASCADE;
  DROP TABLE "payload"."pages_blocks_feature_strip_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_feature_strip" CASCADE;
  DROP TABLE "payload"."pages_blocks_compare_table_columns" CASCADE;
  DROP TABLE "payload"."pages_blocks_compare_table_rows_cells" CASCADE;
  DROP TABLE "payload"."pages_blocks_compare_table_rows" CASCADE;
  DROP TABLE "payload"."pages_blocks_compare_table" CASCADE;
  DROP TABLE "payload"."pages_blocks_faq_section_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_faq_section" CASCADE;
  DROP TABLE "payload"."pages_blocks_cta_band_actions" CASCADE;
  DROP TABLE "payload"."pages_blocks_cta_band" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_pricing_plans_trust_items" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_pricing_plans_plans_features" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_pricing_plans_plans" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_pricing_plans" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_feature_strip_items" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_feature_strip" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_compare_table_columns" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_compare_table_rows_cells" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_compare_table_rows" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_compare_table" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_faq_section_items" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_faq_section" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_cta_band_actions" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_cta_band" CASCADE;
  DROP TYPE "payload"."enum_pages_blocks_cta_band_actions_appearance";
  DROP TYPE "payload"."enum__pages_v_blocks_cta_band_actions_appearance";`)
}
