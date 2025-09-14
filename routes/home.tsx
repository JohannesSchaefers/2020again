// routes/home.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface BucketObject {
  key: string;
  url?: string;
}

interface Data {
  bucketObjectsWithUrls?: BucketObject[];
  successMessage?: string;
  error?: string;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302);
    }

    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto";

    let bucketObjectsWithUrls: BucketObject[] = [];
    let error: string | undefined;

    if (accessKeyId && secretAccessKey && bucketName && endpoint) {
      try {
        const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");
        const { getSignedUrl } = await import("https://esm.sh/@aws-sdk/s3-request-presigner?dts");

        const s3Client = new S3Client({
          region,
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: false,
        });

        const command = new ListObjectsV2Command({ Bucket: bucketName });
        const response = await s3Client.send(command);

        if (response.Contents) {
          const keys = response.Contents.map((obj) => obj.Key!).filter(Boolean);
          bucketObjectsWithUrls = await Promise.all(
            keys.map(async (key) => {
              let url: string | undefined;
              if (key.toLowerCase().endsWith('.pdf')) {
                try {
                  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
                  url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
                } catch (signErr) {
                  console.error(`Failed to generate presigned URL for ${key}:`, signErr);
                }
              }
              return { key, url };
            })
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        error = `Failed to access R2 bucket: ${message}`;
      }
    } else {
      error = "Missing R2 environment variables. Check your Deno Deploy settings.";
    }

    return ctx.render({ bucketObjectsWithUrls, error });
  },

  async POST(req, ctx) {
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302);
    }

    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto";

    let bucketObjectsWithUrls: BucketObject[] = [];
    let successMessage: string | undefined;
    let error: string | undefined;

    if (accessKeyId && secretAccessKey && bucketName && endpoint) {
      try {
        const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");
        const { getSignedUrl } = await import("https://esm.sh/@aws-sdk/s3-request-presigner?dts");

        const s3Client = new S3Client({
          region,
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: false,
        });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
          error = "No file selected for upload.";
        } else {
          const fileBuffer = await file.arrayBuffer();
          const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: file.name,
            Body: new Uint8Array(fileBuffer),
            ContentType: file.type,
          });
          await s3Client.send(command);
          successMessage = `File "${file.name}" uploaded successfully!`;
        }

        const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
        const response = await s3Client.send(listCommand);

        if (response.Contents) {
          const keys = response.Contents.map((obj) => obj.Key!).filter(Boolean);
          bucketObjectsWithUrls = await Promise.all(
            keys.map(async (key) => {
              let url: string | undefined;
              if (key.toLowerCase().endsWith('.pdf')) {
                try {
                  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
                  url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
                } catch (signErr) {
                  console.error(`Failed to generate presigned URL for ${key}:`, signErr);
                }
              }
              return { key, url };
            })
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        error = `Failed to upload file or access R2 bucket: ${message}`;
      }
    } else {
      error = "Missing R2 environment variables. Check your Deno Deploy settings.";
    }

    return ctx.render({ bucketObjectsWithUrls, successMessage, error });
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="ml-4 text-blue-600">
      <h1 class="text-3xl font-bold">Welcome to the Homepage</h1>

      {/* Upload Form */}
      <div class="mt-4">
        <h2 class="text-2xl font-semibold">Upload a File</h2>
        <form method="POST" enctype="multipart/form-data" class="mt-2">
          <div class="mb-4">
            <label for="file" class="block text-gray-800 font-semibold mb-2">
              Select a file to upload:
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept="*/*"
              class="text-gray-800"
            />
          </div>
          <button
            type="submit"
            class="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Upload
          </button>
        </form>
        {data.successMessage && (
          <p class="text-green-500 mt-4">{data.successMessage}</p>
        )}
      </div>

      {/* Error Message */}
      {data.error && (
        <p class="text-red-500 mt-4">{data.error}</p>
      )}

      {/* File List */}
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