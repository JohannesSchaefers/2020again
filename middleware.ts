// middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
  const url = new URL(req.url);

  // Öffentliche Routen
  const isPublic =
    url.pathname === "/login" ||
    url.pathname.startsWith("/static") ||
    url.pathname.startsWith("/favicon.ico");

  if (isPublic) {
    return await ctx.next();
  }

  // Cookie prüfen
  const cookie = req.headers.get("cookie") ?? "";
  const isAuthenticated = cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === "auth=true");

  if (isAuthenticated) {
    return await ctx.next();
  }

  // Redirect zur Login-Seite
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
    },
  });
}
