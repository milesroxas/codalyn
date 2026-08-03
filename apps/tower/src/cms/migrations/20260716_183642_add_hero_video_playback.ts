import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_hero_video_playback" AS ENUM('clickToPlay', 'loop');
  CREATE TYPE "payload"."enum__pages_v_version_hero_video_playback" AS ENUM('clickToPlay', 'loop');
  ALTER TABLE "payload"."pages" ADD COLUMN "hero_video_playback" "payload"."enum_pages_hero_video_playback" DEFAULT 'clickToPlay';
  ALTER TABLE "payload"."_pages_v" ADD COLUMN "version_hero_video_playback" "payload"."enum__pages_v_version_hero_video_playback" DEFAULT 'clickToPlay';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages" DROP COLUMN "hero_video_playback";
  ALTER TABLE "payload"."_pages_v" DROP COLUMN "version_hero_video_playback";
  DROP TYPE "payload"."enum_pages_hero_video_playback";
  DROP TYPE "payload"."enum__pages_v_version_hero_video_playback";`)
}
