// routes/api/upload.ts
import { Handlers } from "$fresh/server.ts";
import { S3Client, PutObjectCommand, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3?dts";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner?dts";

interface ResponseData {
  message?: string;
  error?: string;
  file?: { key: string; url: string };
}

export const handler: Handlers = {
  async POST(req, ctx) {
    // Check for session cookie (replace with real auth for production)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302);
    }

    // R2 environment variables
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto";

    let responseData: ResponseData = {};

    if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
      responseData.error = "Missing R2 environment variables. Check your Deno Deploy settings.";
      return new Response(JSON.stringify(responseData), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Parse form data
      const formData = await req.formData();
      const file = formData.get("pdf");

      if (!(file instanceof File)) {
        responseData.error = "No valid PDF file provided.";
        return new Response(JSON.stringify(responseData), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate file type
      if (file.type !== "application/pdf") {
        responseData.error = "Only PDF files are allowed.";
        return new Response(JSON.stringify(responseData), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create S3 client for R2
      const s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: false,
      });

      // Generate unique file name
      const fileName = `${crypto.randomUUID()}_${file.name}`;

      // Upload file to R2
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: await file.arrayBuffer(),
        ContentType: "application/pdf",
      });

      await s3Client.send(putCommand);

      // Generate presigned URL for the uploaded file
      const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: fileName });
      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      responseData.message = "PDF successfully uploaded.";
      responseData.file = { key: fileName, url };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      responseData.error = `Failed to upload PDF: ${message}`;
      return new Response(JSON.stringify(responseData), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};