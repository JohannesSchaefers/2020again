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

      // Validate file type (optional, for added security)
      if (!file.type.includes("pdf")) {
        return new Response(
          JSON.stringify({ error: "Invalid file type. Please upload a PDF." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Save the file to a local directory (ensure ./uploads exists)
      const filePath = `./uploads/${file.name}`;
      await Deno.writeFile(filePath, new Uint8Array(await file.arrayBuffer()));

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