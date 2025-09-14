/*

// routes/home.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

// Define types for PageProps
interface BucketObject {
  key: string;
  url?: string; // Presigned URL for PDFs
}

interface Data {
  bucketObjectsWithUrls?: BucketObject[]; // List of objects with keys and optional URLs from R2
  error?: string; // Optional error message
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    // Check for session cookie (replace with real auth check for production)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302); // Redirect to login if not authenticated
    }

    // R2 environment variables
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto"; // R2 uses 'auto' for region

    let bucketObjectsWithUrls: BucketObject[] = [];
    let error: string | undefined;

    if (accessKeyId && secretAccessKey && bucketName && endpoint) {
      try {
        // Import AWS SDK for S3 (ESM import; Deno-compatible with proper scoped URL)
        const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");
        const { getSignedUrl } = await import("https://esm.sh/@aws-sdk/s3-request-presigner?dts");

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
          const keys = response.Contents.map((obj) => obj.Key!).filter(Boolean);
          
          // Generate presigned URLs only for PDFs
          bucketObjectsWithUrls = await Promise.all(
            keys.map(async (key) => {
              let url: string | undefined;
              if (key.toLowerCase().endsWith('.pdf')) {
                try {
                  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
                  url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hour expiration
                } catch (signErr) {
                  console.error(`Failed to generate presigned URL for ${key}:`, signErr);
                  // Fall back to no URL if signing fails
                }
              }
              return { key, url };
            })
          );
        }
      } catch (err) {
        // Type guard to narrow 'err' from unknown to Error
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        error = `Failed to access R2 bucket: ${message}`;
      }
    } else {
      error = "Missing R2 environment variables. Check your Deno Deploy settings.";
    }

    return ctx.render({ bucketObjectsWithUrls, error });
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="ml-4 text-blue-600">
      <h1 class="text-3xl font-bold">Welcome to the Homepage</h1>
      {data.error && (
        <p class="text-red-500 mt-4">{data.error}</p>
      )}
      {!data.error && (
        <div class="mt-4">
          <h2 class="text-2xl font-semibold">Gespeicherte Dateien:</h2>
          {data.bucketObjectsWithUrls && data.bucketObjectsWithUrls.length > 0 ? (
            <ul class="list-disc list-inside mt-2 space-y-1">
              {data.bucketObjectsWithUrls.map((obj, index) => (
                <li key={index} class="text-gray-800">
                  {obj.url ? (
                    <a
                      href={obj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-500 hover:underline"
                    >
                      {obj.key} (PDF)
                    </a>
                  ) : (
                    obj.key
                  )}
                </li>
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
*/

// routes/home.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

// Define types for PageProps
interface BucketObject {
  key: string;
  url?: string; // Presigned URL for PDFs
}

interface Data {
  bucketObjectsWithUrls?: BucketObject[]; // List of objects with keys and optional URLs from R2
  error?: string; // Optional error message
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    // Check for session cookie (replace with real auth check for production)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302); // Redirect to login if not authenticated
    }

    // R2 environment variables
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto"; // R2 uses 'auto' for region

    let bucketObjectsWithUrls: BucketObject[] = [];
    let error: string | undefined;

    if (accessKeyId && secretAccessKey && bucketName && endpoint) {
      try {
        // Import AWS SDK for S3 (ESM import; Deno-compatible with proper scoped URL)
        const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");
        const { getSignedUrl } = await import("https://esm.sh/@aws-sdk/s3-request-presigner?dts");

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
          const keys = response.Contents.map((obj) => obj.Key!).filter(Boolean);

          // Generate presigned URLs only for PDFs
          bucketObjectsWithUrls = await Promise.all(
            keys.map(async (key) => {
              let url: string | undefined;
              if (key.toLowerCase().endsWith('.pdf')) {
                try {
                  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
                  url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hour expiration
                } catch (signErr) {
                  console.error(`Failed to generate presigned URL for ${key}:`, signErr);
                  // Fall back to no URL if signing fails
                }
              }
              return { key, url };
            })
          );
        }
      } catch (err) {
        // Type guard to narrow 'err' from unknown to Error
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        error = `Failed to access R2 bucket: ${message}`;
      }
    } else {
      error = "Missing R2 environment variables. Check your Deno Deploy settings.";
    }

    return ctx.render({ bucketObjectsWithUrls, error });
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="max-w-xl mx-auto p-6 bg-white rounded-lg shadow">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-700">PDF-Upload</h1>
        <a href="/logout" class="text-blue-600 hover:underline">
          Logout
        </a>
      </div>
      {data.error && (
        <p class="text-red-600 mb-4">Fehler: {data.error}</p>
      )}
      <form
        action="/api/upload"
        method="post"
        encType="multipart/form-data"
        class="mb-8 flex items-center gap-3"
      >
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          required
          class="block border border-gray-300 rounded px-3 py-1 focus:ring focus:ring-blue-300"
        />
        <button
          type="submit"
          class="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition"
        >
          Hochladen
        </button>
      </form>
      <h2 class="text-xl font-semibold mb-2">Hochgeladene PDFs</h2>
      <ul>
        {(!data.bucketObjectsWithUrls || data.bucketObjectsWithUrls.length === 0) && (
          <li class="text-gray-500">Keine PDFs gefunden!</li>
        )}
        {data.bucketObjectsWithUrls?.map((obj) => (
          <li key={obj.key} class="mb-2 flex items-center gap-2">
            {obj.url ? (
              <a
                href={obj.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline"
              >
                {obj.key}
              </a>
            ) : (
              <span>{obj.key}</span>
            )}
            <form
              action={`/api/delete?name=${encodeURIComponent(obj.key)}`}
              method="post"
              class="inline"
            >
              <button
                type="submit"
                class="text-red-600 hover:underline ml-2"
              >
                Löschen
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
