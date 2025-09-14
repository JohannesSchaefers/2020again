// routes/api/upload.ts
import { Handlers } from "$fresh/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3?dts";

interface ResponseData {
  message?: string;
  error?: string;
}

export const handler: Handlers = {
  async POST(req, ctx) {
    // Prüfe auf Session-Cookie (ersetze durch echte Authentifizierung für Produktion)
    const isAuthenticated = req.headers.get("cookie")?.includes("session=valid");
    if (!isAuthenticated) {
      return Response.redirect("/login", 302);
    }

    // R2 Umgebungsvariablen
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
      // Formulardaten parsen
      const formData = await req.formData();
      const file = formData.get("pdf");

      if (!(file instanceof File)) {
        responseData.error = "No valid PDF file provided.";
        return new Response(JSON.stringify(responseData), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Prüfe Dateityp
      if (file.type !== "application/pdf") {
        responseData.error = "Only PDF files are allowed.";
        return new Response(JSON.stringify(responseData), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Erstelle S3 Client für R2
      const s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: false,
      });

      // Eindeutigen Dateinamen generieren
      const fileName = `${crypto.randomUUID()}_${file.name}`;
      
      // Datei in R2 hochladen
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: await file.arrayBuffer(),
        ContentType: "application/pdf",
      });

      await s3Client.send(putCommand);

      responseData.message = "PDF successfully uploaded.";
      return Response.redirect("/", 302);
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