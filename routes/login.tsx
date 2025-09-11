// routes/login.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    return ctx.render();
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const password = form.get("password");

    // Example: Validate password (replace with real auth logic)
    if (password === "password") { // Replace with your password check
      const headers = new Headers();
      headers.set("set-cookie", "session=valid; Path=/; HttpOnly; SameSite=Strict");
      headers.set("Location", "/home");
      return new Response(null, { status: 302, headers });
    }

    // On failure, re-render with an error
    return ctx.render({ error: "Invalid password" });
  },
};

export default function Login({ data }: PageProps<{ error?: string }>) {
  return (
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="p-6 bg-white rounded shadow-md">
        <h1 class="text-2xl font-bold text-blue-600 mb-4">Login</h1>
        {data?.error && <p class="text-red-500 mb-4">{data.error}</p>}
        <form method="POST">
          <div class="mb-4">
            <label class="block text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              class="w-full p-2 border rounded"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            class="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}