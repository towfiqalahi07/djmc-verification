const SHEET_NAME = 'VerificationRequests';
const STATUS_COLUMN = 'Verified';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    validatePayload_(payload);

    const trackingId = generateTrackingId_();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || createSheet_(spreadsheet);

    const admissionCopyUrl = saveFile_(payload.admissionCopy, trackingId, 'admission-copy');
    const resultScreenshotUrl = saveFile_(payload.resultScreenshot, trackingId, 'result-screenshot');
    const paymentReceiptUrl = saveFile_(payload.paymentReceipt, trackingId, 'payment-receipt');

    sheet.appendRow([
      new Date(),
      trackingId,
      payload.fullName,
      payload.facebookLink,
      admissionCopyUrl,
      resultScreenshotUrl,
      paymentReceiptUrl,
      '',
    ]);

    return jsonOutput_({ success: true, trackingId });
  } catch (error) {
    return jsonOutput_({ success: false, error: error.message });
  }
}

function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    if (action !== 'status') {
      return jsonOutput_({ success: false, error: 'Invalid action.' });
    }

    const trackingId = String(e.parameter.trackingId || '').trim();
    if (!trackingId) {
      throw new Error('Tracking ID is required.');
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('No verification data available yet.');
    }

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const trackingCol = headers.indexOf('TrackingID');
    const verifiedCol = headers.indexOf(STATUS_COLUMN);

    if (trackingCol === -1 || verifiedCol === -1) {
      throw new Error('Sheet headers are missing required columns.');
    }

    const row = values.find((r, i) => i > 0 && String(r[trackingCol]).trim() === trackingId);
    if (!row) {
      throw new Error('Tracking ID not found.');
    }

    const verified = row[verifiedCol];
    let status = 'pending';

    if (verified === true || String(verified).toLowerCase() === 'yes' || String(verified).toLowerCase() === 'true') {
      status = 'verified';
    } else if (verified === false || String(verified).toLowerCase() === 'no' || String(verified).toLowerCase() === 'false') {
      status = 'rejected';
    }

    return jsonOutput_({ success: true, status });
  } catch (error) {
    return jsonOutput_({ success: false, error: error.message });
  }
}

function validatePayload_(payload) {
  const requiredText = ['fullName', 'facebookLink'];
  requiredText.forEach((field) => {
    if (!payload[field] || !String(payload[field]).trim()) {
      throw new Error(`Missing field: ${field}`);
    }
  });

  ['admissionCopy', 'resultScreenshot', 'paymentReceipt'].forEach((field) => {
    if (!payload[field] || !payload[field].base64 || !payload[field].fileName) {
      throw new Error(`Missing file: ${field}`);
    }
  });
}

function generateTrackingId_() {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DJMC35-${randomPart}`;
}

function saveFile_(fileData, trackingId, label) {
  const folder = getOrCreateFolder_('DJMC35 Verification Uploads');
  const bytes = Utilities.base64Decode(fileData.base64);
  const extension = (fileData.fileName.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${trackingId}-${label}.${extension}`;
  const blob = Utilities.newBlob(bytes, fileData.mimeType || 'image/jpeg', fileName);
  const file = folder.createFile(blob);
  return file.getUrl();
}

function getOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function createSheet_(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEET_NAME);
  sheet.appendRow([
    'Timestamp',
    'TrackingID',
    'Name',
    'FacebookLink',
    'AdmissionCopyURL',
    'ResultScreenshotURL',
    'PaymentReceiptURL',
    STATUS_COLUMN,
  ]);

  sheet.getRange('H2:H').insertCheckboxes();
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
