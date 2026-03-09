# DJMC 35 Verification Portal (Appwrite)

This project is fully rewritten to use **Appwrite Cloud** as the free backend (database + storage + auth), replacing Google Sheets and custom Python backend usage.

## Features
- Applicant form fields:
  - Full name
  - MBBS admission applicant copy screenshot
  - Result screenshot (roll visible)
  - Facebook profile link (must be in DJMC35 Messenger group)
  - Live camera-captured admission payment receipt photo
- Unique tracking ID generation (`DJMC35-XXXXXX`)
- Status page by tracking ID:
  - Pending → ⚠️ yellow warning
  - Verified → ✅ green tick
  - Rejected → ❌ red cross
- Admin approval flow:
  - Admin signs in with Appwrite Auth account
  - Admin updates applicant status (pending/verified/rejected)
- Tracking ID success UI includes a **click-to-copy icon button**

## Pages and Scripts
- `index.html` + `scripts/app.js`: application submission page
- `status.html` + `scripts/status.js`: tracking status check page
- `admin.html` + `scripts/admin.js`: admin login + status update page
- `scripts/config.js`: Appwrite credentials/config
- `scripts/appwrite-client.js`: common Appwrite helpers
- `styles.css`: shared styling

## Appwrite Setup

### 1) Create a Project
- Go to: `https://cloud.appwrite.io`
- Create project and copy Project ID.

### 2) Create Database + Collection
Create one collection (example: `verification_requests`) with these attributes:
- `trackingId` (string, required)
- `fullName` (string, required)
- `facebookLink` (string, required)
- `admissionCopyFileId` (string, required)
- `resultScreenshotFileId` (string, required)
- `paymentReceiptFileId` (string, required)
- `admissionCopyUrl` (string, required)
- `resultScreenshotUrl` (string, required)
- `paymentReceiptUrl` (string, required)
- `status` (string, required, default: `pending`)

Create a unique index on `trackingId`.

### 3) Create Storage Bucket
Create one bucket (example: `verification-files`) for uploaded images.

### 4) Permissions (important)
- Collection: allow authenticated/anonymous clients to create documents.
- Document read: app sets `read(any)` on create so status page can query by tracking ID.
- Admin updates: ensure admin accounts can update documents.
- Bucket: allow file create/read for the client flow.

### 5) Admin Accounts
- Create admin users in Appwrite Authentication.
- Optional: create an Appwrite Team for admins and set `APPWRITE_ADMIN_TEAM_ID` in config.

### 6) Configure `scripts/config.js`
Fill these values:
```js
window.APP_CONFIG = {
  APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: 'YOUR_PROJECT_ID',
  APPWRITE_DATABASE_ID: 'YOUR_DATABASE_ID',
  APPWRITE_COLLECTION_ID: 'YOUR_COLLECTION_ID',
  APPWRITE_BUCKET_ID: 'YOUR_BUCKET_ID',
  APPWRITE_ADMIN_TEAM_ID: '', // optional
};
```

## Run Locally
Serve as static files:
```bash
python3 -m http.server 8080
```
Open:
- `http://localhost:8080/index.html`
- `http://localhost:8080/status.html`
- `http://localhost:8080/admin.html`

## Notes
- Mobile camera capture may require HTTPS in production.
- Tracking ID copy button appears after successful submission.
