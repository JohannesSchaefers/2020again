// routes/home.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

// Define types for PageProps
interface Data {
  envVar: string;
  bucketObjects?: string[]; // List of object keys from R2
  error?: string; // Optional error message
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    // Check for session cookie (replace with real auth check for production)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302); // Redirect to login if not authenticated
    }

    // Fetch environment variable from Deno Deploy
    const envVar = Deno.env.get("TEST_VAR") || "Default Value";

    // R2 environment variables
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto"; // R2 uses 'auto' for region

    let bucketObjects: string[] = [];
    let error: string | undefined;

    if (accessKeyId && secretAccessKey && bucketName && endpoint) {
      try {
        // Import AWS SDK for S3 (ESM import; Deno-compatible with proper scoped URL)
        const { S3Client, ListObjectsV2Command } = await import("https://esm.sh/@aws-sdk/client-s3?dts");

        // Create S3 client configured for R2
        const s3Client = new S3Client({
          region,
          endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: false, // Use virtual-hosted style for R2
        });

        // List objects in the bucket
        const command = new ListObjectsV2Command({ Bucket: bucketName });
        const response = await s3Client.send(command);

        if (response.Contents) {
          bucketObjects = response.Contents.map((obj) => obj.Key!).filter(Boolean);
        }
      } catch (err) {
        // Type guard to narrow 'err' from unknown to Error
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        error = `Failed to access R2 bucket: ${message}`;
      }
    } else {
      error = "Missing R2 environment variables. Check your Deno Deploy settings.";
    }

    return ctx.render({ envVar, bucketObjects, error });
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="ml-4 text-blue-600">
      <h1 class="text-3xl font-bold">Welcome to the Home Page!!!</h1>
      <p>
        Environment Variable: <span class="text-green-300 text-xl">{data.envVar}</span>
      </p>
      {data.error && (
        <p class="text-red-500 mt-4">{data.error}</p>
      )}
      {!data.error && (
        <div class="mt-4">
          <h2 class="text-2xl font-semibold">R2 Bucket Objects:</h2>
          {data.bucketObjects && data.bucketObjects.length > 0 ? (
            <ul class="list-disc list-inside mt-2">
              {data.bucketObjects.map((key, index) => (
                <li key={index} class="text-gray-800">{key}</li>
              ))}
            </ul>
          ) : (
            <p class="text-gray-500 mt-2">No objects found in the bucket (or bucket is empty).</p>
          )}
        </div>
      )}
    </div>
  );
}