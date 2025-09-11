// routes/home.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

// Define types for PageProps
interface Data {
  envVar: string;
}

export const handler: Handlers<Data> = {
  GET(req, ctx) {
    // Check for session cookie (replace with real auth check for production)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302); // Redirect to login if not authenticated
    }

    // Fetch environment variable from Deno Deploy
    const envVar = Deno.env.get("TEST_VAR") || "Default Value";
    return ctx.render({ envVar });
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="ml-4 text-blue-600">
      <h1 class="text-3xl font-bold">Welcome to the Home Page!!!</h1>
      <p>
        Environment Variable: <span class="text-green-300 text-xl">{data.envVar}</span>
      </p>
    </div>
  );
}