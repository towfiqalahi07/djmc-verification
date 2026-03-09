# DJMC 35 Verification Portal

A simple verification portal for DJMC 35 applicants.

## Features
- Collects:
  - Name
  - MBBS admission applicant copy screenshot
  - Result screenshot (roll visible)
  - Facebook profile link
  - Live admission payment receipt photo (captured using device camera)
- Saves all submission data in Google Sheets.
- Generates and stores a unique tracking ID (`DJMC35-XXXXXX`) for every applicant.
- Status lookup page by tracking ID.
- Status rules from the sheet `Verified` checkbox/value:
  - Empty = pending (⚠️ yellow)
  - Yes/TRUE/checked = verified (✅ green)
  - No/FALSE/unchecked = rejected (❌ red)

## Project Structure
- `index.html`: applicant submission form
- `status.html`: tracking status checker
- `styles.css`: portal styling
- `scripts/config.js`: configure your Google Apps Script URL
- `scripts/app.js`: form submission logic + payment receipt camera capture
- `scripts/status.js`: status check logic
- `google-apps-script/Code.gs`: backend script for Google Sheets + Drive storage

## Google Sheets + Apps Script Setup
1. Create a Google Spreadsheet.
2. Open **Extensions → Apps Script**.
3. Replace default code with `google-apps-script/Code.gs`.
4. Save and deploy as **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** (or your preferred setting)
5. Copy Web App URL.
6. Edit `scripts/config.js` and set:
   ```js
   window.APP_CONFIG = {
     GOOGLE_SCRIPT_URL: "YOUR_WEB_APP_URL"
   };
   ```
7. Host these static files (`index.html`, `status.html`, etc.) anywhere.

## Admin Workflow in Sheet
- Every new request appears with uploaded image links and a generated `TrackingID`.
- Admin can DM the same tracking ID to applicant.
- Admin sets `Verified` column using checkbox/value:
  - `TRUE` / Yes => Verified
  - `FALSE` / No => Rejected
  - Leave empty => Pending

## Local Run
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080`.
