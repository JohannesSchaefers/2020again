import { Handlers } from "$fresh/server.ts";

// Define the ResponseData interface for type safety
interface ResponseData {
  message?: string;
  error?: string;
}

export const handler: Handlers = {
  async POST(req, _ctx) {
    // Check for session cookie (replace with proper authentication for production)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302);
    }

    // R2 environment variables
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const endpoint = Deno.env.get("R2_CUSTOM_DOMAIN") || Deno.env.get("R2_ENDPOINT");
    const region = "auto"; // R2 uses 'auto' for region

    if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing R2 environment variables. Check your Deno Deploy settings." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      // Parse form data from the request
      const formData = await req.formData();
      const file = formData.get("pdf");

      // Validate that a file was provided and is a File object
      if (!(file instanceof File)) {
        return new Response(
          JSON.stringify({ error: "No PDF file provided" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate file type
      if (!file.type.includes("pdf")) {
        return new Response(
          JSON.stringify({ error: "Invalid file type. Please upload a PDF." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Sanitize file name to avoid issues with special characters
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      // Import AWS SDK for S3
      const { S3Client, PutObjectCommand } = await import("https://esm.sh/@aws-sdk/client-s3?dts");

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

      // Upload the file to R2
      const fileBuffer = new Uint8Array(await file.arrayBuffer());
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: sanitizedFileName,
        Body: fileBuffer,
        ContentType: "application/pdf",
      });
      await s3Client.send(putCommand);

      // Return success response
      const responseData: ResponseData = { message: "PDF successfully uploaded." };
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle errors with type checking
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Upload error:", error); // Log for debugging
      return new Response(
        JSON.stringify({ error: `Failed to upload PDF: ${errorMessage}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};