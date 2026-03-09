const statusForm = document.getElementById('statusForm');
const statusBtn = document.getElementById('statusBtn');
const statusResult = document.getElementById('statusResult');

const renderStatus = (status) => {
  statusResult.className = 'status-result';

  if (status === 'verified') {
    statusResult.classList.add('verified');
    statusResult.innerHTML = '<span class="icon">✅</span><span>You are verified.</span>';
    return;
  }

  if (status === 'rejected') {
    statusResult.classList.add('rejected');
    statusResult.innerHTML = '<span class="icon">❌</span><span>Your application was rejected.</span>';
    return;
  }

  statusResult.classList.add('pending');
  statusResult.innerHTML = '<span class="icon">⚠️</span><span>Your application is pending review.</span>';
};

statusForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusBtn.disabled = true;
  statusBtn.textContent = 'Checking...';

  try {
    const trackingId = String(new FormData(statusForm).get('trackingId') || '').trim();
    if (!trackingId) {
      throw new Error('Please enter tracking ID.');
    }

    const services = createServices();
    await ensureAnonymousSession(services.account);

    const results = await services.databases.listDocuments(
      services.cfg.APPWRITE_DATABASE_ID,
      services.cfg.APPWRITE_COLLECTION_ID,
      [services.Query.equal('trackingId', trackingId), services.Query.limit(1)]
    );

    if (!results.total) {
      throw new Error('Tracking ID not found.');
    }

    renderStatus(results.documents[0].status || 'pending');
  } catch (error) {
    statusResult.className = 'status-result rejected';
    statusResult.innerHTML = `<span class="icon">❌</span><span>${error.message || 'Status check failed.'}</span>`;
  } finally {
    statusBtn.disabled = false;
    statusBtn.textContent = 'Check Status';
  }
});
