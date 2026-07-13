import type { CollectionConfig } from "payload";

/**
 * CMS editor accounts for the marketing admin panel (`/admin`).
 * Independent of Tower's better-auth `user` table — Payload owns its own
 * auth (cookie `payload-token`) and its tables live in the `payload` pg schema.
 */
export const CmsUsers: CollectionConfig = {
  slug: "cms-users",
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  access: {
    // Only signed-in CMS editors can manage editor accounts.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
  ],
};
