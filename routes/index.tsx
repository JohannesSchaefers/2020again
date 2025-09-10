// routes/index.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface Data {
  envVar: string;
}

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    // Retrieve the environment variable
    const envVar = Deno.env.get("TEST_VAR") || "Not set";
    return ctx.render({ envVar });
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div style={{ marginLeft: "1cm" }}>
      <h1>Welcome to the Home Page!!!</h1>
      <p>Environment Variable: {data.envVar}</p>
    </div>
  );
}