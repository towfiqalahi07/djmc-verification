const adminForm = document.getElementById('adminForm');
const adminMessage = document.getElementById('adminMessage');

const showAdminMessage = (type, text) => {
  adminMessage.className = `message ${type}`;
  adminMessage.textContent = text;
};

const ensureApiBaseUrl = () => {
  const baseUrl = window.APP_CONFIG?.API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error('Portal is not configured yet. Please set API_BASE_URL in scripts/config.js');
  }
  return baseUrl;
};

adminForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const baseUrl = ensureApiBaseUrl();
    const data = new FormData(adminForm);
    const payload = {
      trackingId: data.get('trackingId').toString().trim(),
      status: data.get('status').toString(),
    };
    const adminSecret = data.get('adminSecret').toString();

    const response = await fetch(`${baseUrl}/admin/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Update failed.');
    }

    showAdminMessage('success', 'Verification status updated successfully.');
  } catch (error) {
    showAdminMessage('error', error.message || 'Unexpected error occurred.');
  }
});
