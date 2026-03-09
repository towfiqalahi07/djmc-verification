const getAppConfig = () => {
  const cfg = window.APP_CONFIG || {};
  const required = [
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_DATABASE_ID',
    'APPWRITE_COLLECTION_ID',
    'APPWRITE_BUCKET_ID',
  ];

  const missing = required.filter((key) => !String(cfg[key] || '').trim());
  if (missing.length > 0) {
    throw new Error(`Missing Appwrite config: ${missing.join(', ')}`);
  }

  return cfg;
};

const createServices = () => {
  const cfg = getAppConfig();
  const client = new Appwrite.Client().setEndpoint(cfg.APPWRITE_ENDPOINT).setProject(cfg.APPWRITE_PROJECT_ID);

  return {
    cfg,
    ID: Appwrite.ID,
    Query: Appwrite.Query,
    Permission: Appwrite.Permission,
    Role: Appwrite.Role,
    account: new Appwrite.Account(client),
    databases: new Appwrite.Databases(client),
    storage: new Appwrite.Storage(client),
    teams: new Appwrite.Teams(client),
  };
};

const ensureAnonymousSession = async (account) => {
  try {
    await account.get();
  } catch (_error) {
    await account.createAnonymousSession();
  }
};

const makeTrackingId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';

  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  return `DJMC35-${suffix}`;
};

const buildFileViewUrl = (cfg, fileId) => (
  `${cfg.APPWRITE_ENDPOINT}/storage/buckets/${cfg.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${cfg.APPWRITE_PROJECT_ID}`
);

const uploadImageFile = async (services, file, prefix) => {
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const wrappedFile = new File([file], `${safePrefix}-${Date.now()}-${file.name || 'capture.jpg'}`, {
    type: file.type || 'image/jpeg',
  });

  return services.storage.createFile(
    services.cfg.APPWRITE_BUCKET_ID,
    services.ID.unique(),
    wrappedFile,
    [services.Permission.read(services.Role.any())]
  );
};
