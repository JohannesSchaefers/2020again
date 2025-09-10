// routes/index.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface Data {
  isAuthenticated: boolean;
}

export const handler: Handlers<Data> = {
  GET(req, ctx) {
    const cookie = req.headers.get("cookie");
    const isAuthenticated = cookie?.includes("auth=true") || false;

    if (isAuthenticated) {
      return ctx.render({ isAuthenticated: true });
    }

    // Redirect to login if not authenticated
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  },
};

export default function Home({ data }: PageProps<Data>) {
  if (!data.isAuthenticated) {
    return null; // Won't be reached due to redirect
  }

  return (
    <div>
      <h1>Welcome!</h1>
      <p>This is the protected home page 11.</p>
      <a href="/logout">Logout</a>
    </div>
  );
}