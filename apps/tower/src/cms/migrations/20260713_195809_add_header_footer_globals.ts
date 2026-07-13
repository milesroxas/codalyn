import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_header_nav_items_items_link_link_type" AS ENUM('internal', 'custom');
  CREATE TYPE "payload"."enum_header_nav_items_type" AS ENUM('link', 'dropdown');
  CREATE TYPE "payload"."enum_header_nav_items_link_link_type" AS ENUM('internal', 'custom');
  CREATE TYPE "payload"."enum_header_actions_appearance" AS ENUM('primary', 'secondary');
  CREATE TYPE "payload"."enum_header_actions_link_link_type" AS ENUM('internal', 'custom');
  CREATE TYPE "payload"."enum_footer_columns_links_link_link_type" AS ENUM('internal', 'custom');
  CREATE TYPE "payload"."enum_footer_social_links_platform" AS ENUM('x', 'github', 'linkedin', 'youtube', 'instagram');
  CREATE TYPE "payload"."enum_footer_legal_links_link_link_type" AS ENUM('internal', 'custom');
  CREATE TABLE "payload"."header_nav_items_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"description" varchar,
  	"link_link_type" "payload"."enum_header_nav_items_items_link_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."header_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "payload"."enum_header_nav_items_type" DEFAULT 'link' NOT NULL,
  	"label" varchar NOT NULL,
  	"link_link_type" "payload"."enum_header_nav_items_link_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"appearance" "payload"."enum_header_actions_appearance" DEFAULT 'primary' NOT NULL,
  	"link_link_type" "payload"."enum_header_actions_link_link_type" DEFAULT 'internal' NOT NULL,
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."header" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_link_type" "payload"."enum_footer_columns_links_link_link_type" DEFAULT 'internal' NOT NULL,
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "payload"."enum_footer_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."footer_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_link_type" "payload"."enum_footer_legal_links_link_link_type" DEFAULT 'internal' NOT NULL,
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"tagline" varchar,
  	"copyright" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."header_nav_items_items" ADD CONSTRAINT "header_nav_items_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."header_nav_items_items" ADD CONSTRAINT "header_nav_items_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."header_nav_items" ADD CONSTRAINT "header_nav_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."header_nav_items" ADD CONSTRAINT "header_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."header_actions" ADD CONSTRAINT "header_actions_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."header_actions" ADD CONSTRAINT "header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."header" ADD CONSTRAINT "header_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."footer_columns_links" ADD CONSTRAINT "footer_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_social_links" ADD CONSTRAINT "footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_legal_links" ADD CONSTRAINT "footer_legal_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."footer_legal_links" ADD CONSTRAINT "footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer" ADD CONSTRAINT "footer_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "header_nav_items_items_order_idx" ON "payload"."header_nav_items_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_items_parent_id_idx" ON "payload"."header_nav_items_items" USING btree ("_parent_id");
  CREATE INDEX "header_nav_items_items_link_link_page_idx" ON "payload"."header_nav_items_items" USING btree ("link_page_id");
  CREATE INDEX "header_nav_items_order_idx" ON "payload"."header_nav_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_parent_id_idx" ON "payload"."header_nav_items" USING btree ("_parent_id");
  CREATE INDEX "header_nav_items_link_link_page_idx" ON "payload"."header_nav_items" USING btree ("link_page_id");
  CREATE INDEX "header_actions_order_idx" ON "payload"."header_actions" USING btree ("_order");
  CREATE INDEX "header_actions_parent_id_idx" ON "payload"."header_actions" USING btree ("_parent_id");
  CREATE INDEX "header_actions_link_link_page_idx" ON "payload"."header_actions" USING btree ("link_page_id");
  CREATE INDEX "header_logo_idx" ON "payload"."header" USING btree ("logo_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "payload"."footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "payload"."footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_links_link_link_page_idx" ON "payload"."footer_columns_links" USING btree ("link_page_id");
  CREATE INDEX "footer_columns_order_idx" ON "payload"."footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "payload"."footer_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_social_links_order_idx" ON "payload"."footer_social_links" USING btree ("_order");
  CREATE INDEX "footer_social_links_parent_id_idx" ON "payload"."footer_social_links" USING btree ("_parent_id");
  CREATE INDEX "footer_legal_links_order_idx" ON "payload"."footer_legal_links" USING btree ("_order");
  CREATE INDEX "footer_legal_links_parent_id_idx" ON "payload"."footer_legal_links" USING btree ("_parent_id");
  CREATE INDEX "footer_legal_links_link_link_page_idx" ON "payload"."footer_legal_links" USING btree ("link_page_id");
  CREATE INDEX "footer_logo_idx" ON "payload"."footer" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."header_nav_items_items" CASCADE;
  DROP TABLE "payload"."header_nav_items" CASCADE;
  DROP TABLE "payload"."header_actions" CASCADE;
  DROP TABLE "payload"."header" CASCADE;
  DROP TABLE "payload"."footer_columns_links" CASCADE;
  DROP TABLE "payload"."footer_columns" CASCADE;
  DROP TABLE "payload"."footer_social_links" CASCADE;
  DROP TABLE "payload"."footer_legal_links" CASCADE;
  DROP TABLE "payload"."footer" CASCADE;
  DROP TYPE "payload"."enum_header_nav_items_items_link_link_type";
  DROP TYPE "payload"."enum_header_nav_items_type";
  DROP TYPE "payload"."enum_header_nav_items_link_link_type";
  DROP TYPE "payload"."enum_header_actions_appearance";
  DROP TYPE "payload"."enum_header_actions_link_link_type";
  DROP TYPE "payload"."enum_footer_columns_links_link_link_type";
  DROP TYPE "payload"."enum_footer_social_links_platform";
  DROP TYPE "payload"."enum_footer_legal_links_link_link_type";`)
}
