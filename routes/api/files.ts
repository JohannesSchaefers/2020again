// routes/api/files.ts
import { Handlers } from "$fresh/server.ts";
import { getBucketObjects } from "../home.tsx";

export const handler: Handlers = {
  async GET() {
    try {
      const files = await getBucketObjects();
      return new Response(JSON.stringify({ files }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (_e) {
      return new Response(JSON.stringify({ files: [] }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
