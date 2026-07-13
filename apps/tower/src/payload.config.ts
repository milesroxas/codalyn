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

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
  collections: [CmsUsers, Media, Pages],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // Isolated pg schema — keeps Payload's drizzle-managed tables away from
    // Tower's better-auth/drizzle-kit tables in `public`.
    schemaName: "payload",
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
