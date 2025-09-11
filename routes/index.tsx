// routes/index.tsx
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(req) {
    // Get the full URL from the request
    const url = new URL(req.url);
    // Construct the full URL for /login
    const loginUrl = `${url.origin}/login`;
    return Response.redirect(loginUrl, 302);
  },
};