// routes/api/upload.ts
import { Handlers } from "$fresh/server.ts";
import { S3Client, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.645.0?dts";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.645.0?dts";

interface ResponseData {
  message?: string;
  error?: string;
  file?: { key: string; url: string };
}

export const handler: Handlers = {
  async POST(req, ctx) {
    // Simple auth check (replace with real auth in production)
    if (!req.headers.get("cookie")?.includes("session=valid")) {
      return Response.redirect("/login", 302);
    }

    // R2 environment variables
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