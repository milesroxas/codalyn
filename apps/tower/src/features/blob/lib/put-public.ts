import { put } from "@vercel/blob";

export async function putPublicBlob(pathname: string, body: Buffer, contentType: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for Vercel Blob uploads.");
  }
  return put(pathname, body, {
    access: "public",
    token,
    contentType,
  });
}
