import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { buildConfig } from "payload";
import sharp from "sharp";
import { CmsUsers } from "./cms/collections/cms-users";
import { Media } from "./cms/collections/media";
import { Pages } from "./cms/collections/pages";
import { StreamVideos } from "./cms/collections/stream-videos";
import { Footer } from "./cms/globals/footer";
import { Header } from "./cms/globals/header";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "postgres"]);

/** Dev-mode push may only mutate local databases — shared Neon branches (dev/preview/prod) are migration-only. */
function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  try {
    return LOCAL_DB_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return true;
  }
}

export default buildConfig({
  admin: {
    user: CmsUsers.slug,
    importMap: {
      baseDir: dirname,
    },
  },
  routes: {
    // Scope Payload's REST API under /api/payload so it never shadows Tower's /api/* routes.
    api: "/api/payload",
  },
  collections: [CmsUsers, Media, Pages, StreamVideos],
  globals: [Header, Footer],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // Isolated pg schema — keeps Payload's drizzle-managed tables away from
    // Tower's better-auth/drizzle-kit tables in `public`.
    schemaName: "payload",
    push: isLocalDatabaseUrl(process.env.DATABASE_URL),
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    migrationDir: path.resolve(dirname, "cms/migrations"),
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN ?? "",
    }),
  ],
});
