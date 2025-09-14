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
        // Import AWS SDK for S3
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
          forcePathStyle: false,
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
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div class="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg min-h-screen">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">PDF-Upload</h1>
        <a href="/logout" class="text-blue-600 hover:underline text-lg font-medium">
          Logout
        </a>
      </div>

      {/* Error Message */}
      {data.error && (
        <p class="text-red-600 mb-6 p-4 bg-red-100 rounded-lg">{data.error}</p>
      )}

      {/* Success Message Container */}
      <div id="success-message" class="hidden mb-6 p-4 bg-green-100 text-green-800 rounded-lg"></div>

      {/* Upload Form */}
      <form
        id="upload-form"
        action="/api/upload"
        method="post"
        encType="multipart/form-data"
        class="mb-8 flex items-center gap-4"
      >
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          required
          class="block border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-blue-300 text-gray-700"
        />
        <button
          type="submit"
          id="upload-button"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>Hochladen</span>
          <svg id="loading-spinner" class="hidden animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </form>

      {/* Uploaded PDFs List */}
      <h2 class="text-2xl font-semibold mb-4 text-gray-800">Hochgeladene PDFs</h2>
      <ul id="pdf-list" class="space-y-3">
        {(!data.bucketObjectsWithUrls || data.bucketObjectsWithUrls.length === 0) && (
          <li class="text-gray-500">Keine PDFs gefunden!</li>
        )}
        {data.bucketObjectsWithUrls?.map((obj) => (
          <li key={obj.key} class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            {obj.url ? (
              <a
                href={obj.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline truncate max-w-xs"
              >
                {obj.key}
              </a>
            ) : (
              <span class="text-gray-600 truncate max-w-xs">{obj.key}</span>
            )}
            <form
              action={`/api/delete?name=${encodeURIComponent(obj.key)}`}
              method="post"
              class="inline"
            >
              <button
                type="submit"
                class="text-red-600 hover:underline font-medium"
              >
                Löschen
              </button>
            </form>
          </li>
        ))}
      </ul>

      {/* Client-side JavaScript for handling upload */}
      <script>
        {`
          const form = document.getElementById('upload-form');
          const successMessage = document.getElementById('success-message');
          const pdfList = document.getElementById('pdf-list');
          const uploadButton = document.getElementById('upload-button');
          const loadingSpinner = document.getElementById('loading-spinner');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            successMessage.classList.add('hidden');
            uploadButton.disabled = true;
            loadingSpinner.classList.remove('hidden');

            const formData = new FormData(form);
            try {
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });

              const data = await response.json();

              uploadButton.disabled = false;
              loadingSpinner.classList.add('hidden');

              if (data.error) {
                successMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
                successMessage.classList.add('bg-red-100', 'text-red-800');
                successMessage.textContent = data.error;
                return;
              }

              // Show success message with download link
              successMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800');
              successMessage.classList.add('bg-green-100', 'text-green-800');
              successMessage.innerHTML = \`
                PDF erfolgreich hochgeladen! 
                <a href="\${data.file.url}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600">
                  Download \${data.file.key}
                </a>
              \`;

              // Add new PDF to the list
              const li = document.createElement('li');
              li.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
              li.innerHTML = \`
                <a href="\${data.file.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline truncate max-w-xs">
                  \${data.file.key}
                </a>
                <form action="/api/delete?name=\${encodeURIComponent(data.file.key)}" method="post" class="inline">
                  <button type="submit" class="text-red-600 hover:underline font-medium">Löschen</button>
                </form>
              \`;
              pdfList.prepend(li);

              // Clear the file input
              form.reset();

              // Remove "Keine PDFs gefunden!" if it exists
              const noPdfsMessage = pdfList.querySelector('li.text-gray-500');
              if (noPdfsMessage) {
                noPdfsMessage.remove();
              }
            } catch (err) {
              uploadButton.disabled = false;
              loadingSpinner.classList.add('hidden');
              successMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
              successMessage.classList.add('bg-red-100', 'text-red-800');
              successMessage.textContent = 'Fehler beim Hochladen: ' + err.message;
            }
          });
        `}
      </script>
    </div>
  );
}