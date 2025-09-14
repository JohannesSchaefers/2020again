// static/upload.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('upload-form');
  const successMessage = document.getElementById('success-message');
  const pdfList = document.getElementById('pdf-list');
  const uploadButton = document.getElementById('upload-button');
  const loadingSpinner = document.getElementById('loading-spinner');

  if (
    !(form instanceof HTMLFormElement) ||
    !(successMessage instanceof HTMLElement) ||
    !(pdfList instanceof HTMLElement) ||
    !(uploadButton instanceof HTMLButtonElement) ||
    !(loadingSpinner instanceof HTMLElement)
  ) {
    console.error('Missing or incorrect DOM elements.');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successMessage.classList.add('hidden');
    uploadButton.disabled = true;
    loadingSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/', {
        method: 'POST',
        body: new FormData(form),
      });
      const data = await response.json();

      uploadButton.disabled = false;
      loadingSpinner.classList.add('hidden');

      if (data.error) {
        successMessage.classList.remove('hidden');
        successMessage.classList.add('bg-red-100', 'text-red-700');
        successMessage.textContent = data.error;
        return;
      }

      successMessage.classList.remove('hidden');
      successMessage.classList.add('bg-green-100', 'text-green-700');
      successMessage.textContent = `Nice one! Your PDF ‘${data.file.key}’ is uploaded!`;

      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-2 bg-gray-100 rounded';
      li.innerHTML = `
        <a href="${data.file.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline truncate max-w-xs">
          ${data.file.key}
        </a>
        <form action="/api/delete?name=${encodeURIComponent(data.file.key)}" method="post" class="inline">
          <button type="submit" class="text-red-500 hover:underline">Delete</button>
        </form>
      `;
      pdfList.prepend(li);

      form.reset();
      const noPdfsMessage = pdfList.querySelector('li.text-gray-500');
      if (noPdfsMessage) noPdfsMessage.remove();
    } catch (err) {
      uploadButton.disabled = false;
      loadingSpinner.classList.add('hidden');
      successMessage.classList.remove('hidden');
      successMessage.classList.add('bg-red-100', 'text-red-700');
      successMessage.textContent = `Oops, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  });
});