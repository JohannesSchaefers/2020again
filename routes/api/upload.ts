// static/upload.js
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements with explicit type checks
  const form = document.getElementById('upload-form');
  const successMessage = document.getElementById('success-message');
  const pdfList = document.getElementById('pdf-list');
  const uploadButton = document.getElementById('upload-button');
  const loadingSpinner = document.getElementById('loading-spinner');

  // Type guard to ensure elements exist and are of the correct type
  if (
    !(form instanceof HTMLFormElement) ||
    !(successMessage instanceof HTMLElement) ||
    !(pdfList instanceof HTMLElement) ||
    !(uploadButton instanceof HTMLButtonElement) ||
    !(loadingSpinner instanceof HTMLElement)
  ) {
    console.error('One or more required DOM elements are missing or have incorrect types.');
    return;
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset UI state
    successMessage.classList.add('hidden');
    uploadButton.disabled = true; // Safe: uploadButton is HTMLButtonElement
    loadingSpinner.classList.remove('hidden');

    const formData = new FormData(form);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // Restore UI state
      uploadButton.disabled = false;
      loadingSpinner.classList.add('hidden');

      // Handle server error
      if (data.error) {
        successMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
        successMessage.classList.add('bg-red-100', 'text-red-800');
        successMessage.textContent = data.error;
        return;
      }

      // Show success message with download link
      successMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800');
      successMessage.classList.add('bg-green-100', 'text-green-800');
      successMessage.innerHTML = `
        PDF erfolgreich hochgeladen! 
        <a href="${data.file.url}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600">
          Download ${data.file.key}
        </a>
      `;

      // Add new PDF to the list
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
      li.innerHTML = `
        <a href="${data.file.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline truncate max-w-xs">
          ${data.file.key}
        </a>
        <form action="/api/delete?name=${encodeURIComponent(data.file.key)}" method="post" class="inline">
          <button type="submit" class="text-red-600 hover:underline font-medium">Löschen</button>
        </form>
      `;
      pdfList.prepend(li);

      // Clear the file input
      form.reset();

      // Remove "Keine PDFs gefunden!" if it exists
      const noPdfsMessage = pdfList.querySelector('li.text-gray-500');
      if (noPdfsMessage) {
        noPdfsMessage.remove();
      }
    } catch (err) {
      // Handle client-side errors
      uploadButton.disabled = false;
      loadingSpinner.classList.add('hidden');
      successMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
      successMessage.classList.add('bg-red-100', 'text-red-800');
      successMessage.textContent = 'Fehler beim Hochladen: ' + (err instanceof Error ? err.message : 'Unknown error');
    }
  });
});