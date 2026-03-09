# DJMC 35 Verification Portal (No Google Sheets)

This implementation replaces Google Sheets with a **self-hosted Python backend**.

## Features
- Applicant form collects:
  - Name
  - MBBS admission applicant copy screenshot
  - Result screenshot (roll visible)
  - Facebook profile link
  - Live payment receipt photo via camera capture
- Generates unique tracking IDs (`DJMC35-XXXXXX`).
- Stores uploads in `uploads/` and records in `data/submissions.json`.
- Status check page by tracking ID:
  - pending = ⚠️ yellow
  - verified = ✅ green
  - rejected = ❌ red
- Admin page to set status (pending/verified/rejected) using an admin secret.

## Files
- `server.py` → backend API + static file server
- `index.html` → applicant submission form
- `status.html` → applicant status check
- `admin.html` → admin status update
- `scripts/config.js` → API base URL config
- `scripts/app.js` → submit form + camera capture
- `scripts/status.js` → status page logic
- `scripts/admin.js` → admin page logic
- `data/submissions.json` → submission storage
- `uploads/` → uploaded evidence files

## Run
1. Set the API URL in `scripts/config.js` (default is local):
   ```js
   window.APP_CONFIG = {
     API_BASE_URL: "http://localhost:8000/api"
   };
   ```
2. Start backend:
   ```bash
   ADMIN_SECRET="your-strong-secret" python3 server.py
   ```
3. Open:
   - Applicant form: `http://localhost:8000/index.html`
   - Status page: `http://localhost:8000/status.html`
   - Admin page: `http://localhost:8000/admin.html`

## API
- `POST /api/submit` (multipart form data)
- `GET /api/status/<trackingId>`
- `POST /api/admin/update-status` with header `x-admin-secret`

## Important
- Use HTTPS in production for camera access on mobile browsers.
- Keep `ADMIN_SECRET` private.
