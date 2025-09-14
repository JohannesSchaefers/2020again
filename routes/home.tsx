// routes/home.tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.645.0?dts";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.645.0?dts";

interface BucketObject {
  key: string;
  url?: string;
}

interface Data {
  bucketObjectsWithUrls?: BucketObject[];
  error?: string;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    if (!req.headers.get("cookie")?.includes("session=valid")) {
      return Response.redirect("/login", 302);
    }

    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_ENDPOINT");

    let bucketObjectsWithUrls: BucketObject[] = [];
    let error: string | undefined;

    if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
      error = "Missing R2 setup.";
    } else {
      try {
        const s3Client = new S3Client({
          region: "auto",
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
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
                  console.error(`Failed to generate URL for ${key}:`, signErr);
                }
              }
              return { key, url };
            })
          );
        }
      } catch (err) {
        error = `Error accessing R2: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    }

    return ctx.render({ bucketObjectsWithUrls, error });
  },

  async POST(req, _ctx) {
    if (!req.headers.get("cookie")?.includes("session=valid")) {
      return Response.redirect("/login", 302);
    }

    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_ENDPOINT");

    if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
      return new Response(JSON.stringify({ error: "Missing R2 setup" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const formData = await req.formData();
      const file = formData.get("pdf");

      if (!(file instanceof File) || file.type !== "application/pdf") {
        return new Response(JSON.stringify({ error: "Please upload a valid PDF" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const fileName = file.name; // Keep original name, e.g., "Orgchart (1).pdf"

      const s3Client = new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: await file.arrayBuffer(),
          ContentType: "application/pdf",
        })
      );

      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: bucketName, Key: fileName }),
        { expiresIn: 3600 }
      );

      return new Response(
        JSON.stringify({ message: "PDF uploaded", file: { key: fileName, url } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="max-w-xl mx-auto p-4 bg-white rounded-lg shadow">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold text-gray-700">PDF Upload</h1>
        <a href="/login" class="text-blue-500 hover:underline">Logout</a>
      </div>

      {data.error && (
        <p class="text-red-500 mb-4 p-2 bg-red-100 rounded">{data.error}</p>
      )}

      <div id="success-message" class="hidden mb-4 p-2 bg-green-100 text-green-700 rounded"></div>

      <form id="upload-form" action="/" method="post" encType="multipart/form-data" class="mb-6 flex gap-2">
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          required
          class="border border-gray-300 rounded p-2"
        />
        <button
  type="submit"
  id="upload-button"
  class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
>
  Upload
</button>
      </form>

      <h2 class="text-xl font-semibold mb-2">Uploaded PDFs</h2>
      <ul id="pdf-list" class="space-y-2">
        {(!data.bucketObjectsWithUrls || data.bucketObjectsWithUrls.length === 0) && (
          <li class="text-gray-500">No PDFs found!</li>
        )}
        {data.bucketObjectsWithUrls?.map((obj) => (
          <li key={obj.key} class="flex items-center justify-between p-2 bg-gray-100 rounded">
            {obj.url ? (
              <a href={obj.url} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline truncate max-w-xs">
                {obj.key}
              </a>
            ) : (
              <span class="text-gray-600 truncate max-w-xs">{obj.key}</span>
            )}
            <form action={`/api/delete?name=${encodeURIComponent(obj.key)}`} method="post" class="inline">
              <button type="submit" class="text-red-500 hover:underline">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <script src="/upload.js"></script>
    </div>
  );
}