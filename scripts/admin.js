const loginForm = document.getElementById('adminLoginForm');
const reviewForm = document.getElementById('adminForm');
const authState = document.getElementById('authState');
const message = document.getElementById('adminMessage');
const logoutBtn = document.getElementById('logoutBtn');

let services;

const showMessage = (type, text) => {
  message.className = `message ${type}`;
  message.textContent = text;
};

const toggleAdminUi = (loggedIn, label = '') => {
  loginForm.classList.toggle('hidden', loggedIn);
  reviewForm.classList.toggle('hidden', !loggedIn);
  logoutBtn.classList.toggle('hidden', !loggedIn);
  authState.textContent = loggedIn ? `Signed in as ${label}` : 'Not signed in';
};

const validateAdminTeamIfConfigured = async () => {
  const teamId = String(services.cfg.APPWRITE_ADMIN_TEAM_ID || '').trim();
  if (!teamId) {
    return;
  }

  const memberships = await services.teams.listMemberships(teamId);
  if (!memberships.total) {
    throw new Error('Access denied. Your account is not in configured admin team.');
  }
};

const boot = async () => {
  services = createServices();

  try {
    const me = await services.account.get();
    await validateAdminTeamIfConfigured();
    toggleAdminUi(true, me.email || me.name || 'admin');
  } catch (_error) {
    toggleAdminUi(false);
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const data = new FormData(loginForm);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');

    await services.account.createEmailPasswordSession(email, password);
    await validateAdminTeamIfConfigured();
    toggleAdminUi(true, email);
    showMessage('success', 'Admin login successful.');
    loginForm.reset();
  } catch (error) {
    showMessage('error', error.message || 'Login failed.');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await services.account.deleteSession('current');
  } finally {
    toggleAdminUi(false);
  }
});

reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const data = new FormData(reviewForm);
    const trackingId = String(data.get('trackingId') || '').trim();
    const status = String(data.get('status') || 'pending');

    if (!trackingId) {
      throw new Error('Please enter tracking ID.');
    }

    const found = await services.databases.listDocuments(
      services.cfg.APPWRITE_DATABASE_ID,
      services.cfg.APPWRITE_COLLECTION_ID,
      [services.Query.equal('trackingId', trackingId), services.Query.limit(1)]
    );

    if (!found.total) {
      throw new Error('Tracking ID not found.');
    }

    await services.databases.updateDocument(
      services.cfg.APPWRITE_DATABASE_ID,
      services.cfg.APPWRITE_COLLECTION_ID,
      found.documents[0].$id,
      { status }
    );

    showMessage('success', 'Verification status updated successfully.');
  } catch (error) {
    showMessage('error', error.message || 'Status update failed.');
  }
});

boot();
