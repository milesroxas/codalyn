import { webflowDataApiUrl } from "@codalyn/webflow-kit";
import { headers } from "next/headers";
import { auth } from "@/server/auth";

const webflowToken = process.env.WEBFLOW_API_TOKEN;

async function forward(req: Request, segments: string[]) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!webflowToken) {
    return Response.json({ error: "WEBFLOW_API_TOKEN is not configured" }, { status: 503 });
  }

  const target = webflowDataApiUrl(segments);
  const src = new URL(req.url);
  target.search = src.search;

  const method = req.method;
  const outHeaders = new Headers();
  outHeaders.set("Authorization", `Bearer ${webflowToken}`);
  outHeaders.set("Accept", req.headers.get("Accept") ?? "application/json");

  const contentType = req.headers.get("Content-Type");
  if (contentType && method !== "GET" && method !== "HEAD") {
    outHeaders.set("Content-Type", contentType);
  }

  const init: RequestInit = {
    method,
    headers: outHeaders,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  return new Response(res.body, { status: res.status, headers: res.headers });
}

export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function POST(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function PUT(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}
