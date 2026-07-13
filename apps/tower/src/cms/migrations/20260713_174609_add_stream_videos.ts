import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_video_block_playback" AS ENUM('clickToPlay', 'loop');
  CREATE TYPE "payload"."enum__pages_v_blocks_video_block_playback" AS ENUM('clickToPlay', 'loop');
  CREATE TABLE "payload"."pages_blocks_video_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"playback" "payload"."enum_pages_blocks_video_block_playback" DEFAULT 'clickToPlay',
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_video_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"playback" "payload"."enum__pages_v_blocks_video_block_playback" DEFAULT 'clickToPlay',
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."stream_videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"uid" varchar NOT NULL,
  	"poster_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."pages" ADD COLUMN "hero_video_id" integer;
  ALTER TABLE "payload"."_pages_v" ADD COLUMN "version_hero_video_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "stream_videos_id" integer;
  ALTER TABLE "payload"."pages_blocks_video_block" ADD CONSTRAINT "pages_blocks_video_block_video_id_stream_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "payload"."stream_videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_video_block" ADD CONSTRAINT "pages_blocks_video_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_video_block" ADD CONSTRAINT "_pages_v_blocks_video_block_video_id_stream_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "payload"."stream_videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_video_block" ADD CONSTRAINT "_pages_v_blocks_video_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stream_videos" ADD CONSTRAINT "stream_videos_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_video_block_order_idx" ON "payload"."pages_blocks_video_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_block_parent_id_idx" ON "payload"."pages_blocks_video_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_block_path_idx" ON "payload"."pages_blocks_video_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_block_video_idx" ON "payload"."pages_blocks_video_block" USING btree ("video_id");
  CREATE INDEX "_pages_v_blocks_video_block_order_idx" ON "payload"."_pages_v_blocks_video_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_block_parent_id_idx" ON "payload"."_pages_v_blocks_video_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_block_path_idx" ON "payload"."_pages_v_blocks_video_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_video_block_video_idx" ON "payload"."_pages_v_blocks_video_block" USING btree ("video_id");
  CREATE UNIQUE INDEX "stream_videos_uid_idx" ON "payload"."stream_videos" USING btree ("uid");
  CREATE INDEX "stream_videos_poster_idx" ON "payload"."stream_videos" USING btree ("poster_id");
  CREATE INDEX "stream_videos_updated_at_idx" ON "payload"."stream_videos" USING btree ("updated_at");
  CREATE INDEX "stream_videos_created_at_idx" ON "payload"."stream_videos" USING btree ("created_at");
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_hero_video_id_stream_videos_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "payload"."stream_videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_version_hero_video_id_stream_videos_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "payload"."stream_videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stream_videos_fk" FOREIGN KEY ("stream_videos_id") REFERENCES "payload"."stream_videos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_hero_hero_video_idx" ON "payload"."pages" USING btree ("hero_video_id");
  CREATE INDEX "_pages_v_version_hero_version_hero_video_idx" ON "payload"."_pages_v" USING btree ("version_hero_video_id");
  CREATE INDEX "payload_locked_documents_rels_stream_videos_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stream_videos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_video_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_pages_v_blocks_video_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."stream_videos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."pages_blocks_video_block" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_video_block" CASCADE;
  DROP TABLE "payload"."stream_videos" CASCADE;
  ALTER TABLE "payload"."pages" DROP CONSTRAINT "pages_hero_video_id_stream_videos_id_fk";
  
  ALTER TABLE "payload"."_pages_v" DROP CONSTRAINT "_pages_v_version_hero_video_id_stream_videos_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stream_videos_fk";
  
  DROP INDEX "payload"."pages_hero_hero_video_idx";
  DROP INDEX "payload"."_pages_v_version_hero_version_hero_video_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_stream_videos_id_idx";
  ALTER TABLE "payload"."pages" DROP COLUMN "hero_video_id";
  ALTER TABLE "payload"."_pages_v" DROP COLUMN "version_hero_video_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "stream_videos_id";
  DROP TYPE "payload"."enum_pages_blocks_video_block_playback";
  DROP TYPE "payload"."enum__pages_v_blocks_video_block_playback";`)
}
