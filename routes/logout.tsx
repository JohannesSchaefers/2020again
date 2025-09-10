// routes/logout.tsx
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET() {
    // Clear auth cookie
    const headers = new Headers({
      Location: "/login",
      "Set-Cookie": "auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    });
    return new Response(null, { status: 302, headers });
  },
};