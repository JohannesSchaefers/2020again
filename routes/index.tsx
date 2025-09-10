/*
import { useSignal } from "@preact/signals";
import Counter from "../islands/Counter.tsx";

export default function Home() {
  const count = useSignal(3);
  return (
    <div class="px-4 py-8 mx-auto bg-[#86efac]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="text-4xl font-bold">Welcome to Fresh!</h1>
        <p class="my-4">
          Try updating this message in the
          <code class="mx-2">./routes/index.tsx</code> file, and reFresh.
        </p>
        <Counter count={count} />
      </div>
    </div>
  );
}
*/

// routes/index.tsx
import { defineRoute } from "$fresh/server.ts";

export default defineRoute(() => {
  const testVar = Deno.env.get("TEST_VAR") ?? "Default value (not set)";
  return (
    <div class="p-4 mx-auto max-w-screen-md">
      <img
        width="256"
        height="256"
        class="my-6"
        src="/logo.svg"
        alt="the fresh logo: a sliced mango sitting on the corner of a salad"
      />
      <h1 class="text-2xl font-bold">Hello world!</h1>
      <p class="my-6">
        This is a test environment variable: <strong>{testVar}</strong>
      </p>
    </div>
  );
});