/** @jsx h */
import { h } from "preact";
import { useState } from "preact/hooks";

interface BucketObject {
  key: string;
  url?: string;
}

interface Props {
  initialFiles: BucketObject[];
}

export default function UploadForm({ initialFiles }: Props) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [_error, setError] = useState<string | undefined>();

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const json = await res.json();
      setFiles(json.files);
    } catch (e) {
      console.error("Failed to fetch files:", e);
    }
  };

  const handleUpload = async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const file = formData.get("file") as File;

    if (!file) return;

    setUploading(true);
    setError(undefined);

    try {
      const res = await fetch("/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      await fetchFiles(); // Refresh list
      form.reset(); // Reset form
    } catch (_err) {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div class="mt-6 text-blue-600">
      <form onSubmit={handleUpload} encType="multipart/form-data">
        <label class="block mb-2 text-lg font-medium text-gray-700" htmlFor="file">
          Upload a file:
        </label>
        <input
          type="file"
          name="file"
          id="file"
          accept=".pdf"
          required
          class="block mb-4"
        />
        <button
          type="submit"
          disabled={uploading}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <div class="mt-6">
        <h2 class="text-2xl font-semibold">Gespeicherte Dateien:</h2>
        {files.length > 0 ? (
          <ul class="list-disc list-inside mt-2 space-y-1">
            {files.map((obj, index) => (
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
    </div>
  );
}
