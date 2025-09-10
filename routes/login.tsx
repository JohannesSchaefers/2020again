// routes/login.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

export const handler: Handlers = {
  async POST(req) {
    const form = await req.formData();
    const password = form.get("password")?.toString();

    const HARD_CODED_PASSWORD = "123";

    if (password === HARD_CODED_PASSWORD) {
      // Set auth cookie
      const headers = new Headers({
        Location: "/",
        "Set-Cookie": "auth=true; Path=/; HttpOnly; SameSite=Strict",
      });
      return new Response(null, { status: 302, headers });
    }

    // Redirect back to login on failure
    return new Response(null, { status: 302, headers: { Location: "/login?error=invalid" } });
  },
};

export default function LoginPage({ url }: PageProps) {
  const error = new URL(url).searchParams.get("error");
  return (
    <div>
      <h1>Login</h1>
      {error && <p style={{ color: "red" }}>Invalid password</p>}
      <form method="POST">
        <div>
          <label>Password: </label>
          <input type="password" name="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}