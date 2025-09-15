/** @jsx h */
import { Handlers, PageProps } from "$fresh/server.ts";
import { h } from "preact";
import UploadForm from "../islands/UploadForm.tsx";

// Type definitions for the page data
interface BucketObject {
  key: string;
  url?: string;
}

interface Data {
  bucketObjectsWithUrls?: BucketObject[];
  error?: string;
}

// Helper to get environment variables safely
function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Function to fetch files from R2
export async function getBucketObjects(): Promise<BucketObject[]> {
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucketName = getEnv("R2_BUCKET_NAME");
  const endpoint = getEnv("R2_CUSTOM_DOMAIN") || getEnv("R2_ENDPOINT");
  const region = "auto";

  const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");
  const { getSignedUrl } = await import("https://esm.sh/@aws-sdk/s3-request-presigner?dts");

  const s3Client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: false,
  });

  const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
  const listResponse = await s3Client.send(listCommand);

  const keys = listResponse.Contents?.map((obj) => obj.Key!).filter(Boolean) ?? [];

  return await Promise.all(
    keys.map(async (key) => {
      let url: string | undefined;
      if (key.toLowerCase().endsWith(".pdf")) {
        try {
          const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
          url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
        } catch {
          url = undefined;
        }
      }
      return { key, url };
    })
  );
}

// Handlers for fetching files and handling uploads
export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302); // Redirect to login if not authenticated
    }

    try {
      const bucketObjectsWithUrls = await getBucketObjects();
      return ctx.render({ bucketObjectsWithUrls });
    } catch (_err) {
      return ctx.render({ error: "Failed to fetch bucket data" });
    }
  },

  async POST(req) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
    const bucketName = getEnv("R2_BUCKET_NAME");
    const endpoint = getEnv("R2_CUSTOM_DOMAIN") || getEnv("R2_ENDPOINT");
    const region = "auto";

    const { S3Client, PutObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");

    const s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });

    const arrayBuffer = await file.arrayBuffer();
    const key = file.name;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    });

    await s3Client.send(command);

    return new Response(null, { status: 200 });
  },
};

// Main component rendering the page
export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="ml-4 text-blue-600">
      <h1 class="text-3xl font-bold">Welcome to the Homepage</h1>
      {data.error && <p class="text-red-500 mt-4">{data.error}</p>}

      {/* Island component for file upload and dynamic file list */}
      <UploadForm initialFiles={data.bucketObjectsWithUrls ?? []} />
    </div>
  );
}
