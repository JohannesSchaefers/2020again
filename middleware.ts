// middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
  const url = new URL(req.url);
  if (url.pathname === "/login" || url.pathname.startsWith("/static")) {
    return await ctx.next();
  }

  const cookie = req.headers.get("cookie");
  if (cookie?.includes("auth=true")) {
    return await ctx.next();
  }

  return new Response(null, { status: 302, headers: { Location: "/login" } });
}