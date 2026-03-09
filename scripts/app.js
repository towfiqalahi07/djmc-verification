const form = document.getElementById('verificationForm');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const startCameraBtn = document.getElementById('startCameraBtn');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');
const retakePhotoBtn = document.getElementById('retakePhotoBtn');
const cameraStatus = document.getElementById('cameraStatus');
const receiptVideo = document.getElementById('receiptVideo');
const receiptCanvas = document.getElementById('receiptCanvas');

let liveStream;
let receiptBlob;

const setCameraStatus = (text) => {
  cameraStatus.textContent = text;
};

const stopCamera = () => {
  if (!liveStream) {
    return;
  }

  liveStream.getTracks().forEach((track) => track.stop());
  liveStream = undefined;
};

const showError = (text) => {
  message.className = 'message error';
  message.textContent = text;
};

const showSuccessWithCopy = (trackingId) => {
  message.className = 'message success';
  message.innerHTML = `
    <div>Submission completed. Your tracking ID:</div>
    <div class="tracking-row">
      <code>${trackingId}</code>
      <button id="copyTrackingBtn" type="button" class="copy-btn" aria-label="Copy tracking ID" title="Copy tracking ID">📋</button>
    </div>
  `;

  const copyBtn = document.getElementById('copyTrackingBtn');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(trackingId);
      copyBtn.textContent = '✅';
      setTimeout(() => {
        copyBtn.textContent = '📋';
      }, 1200);
    } catch (_error) {
      copyBtn.textContent = '❌';
    }
  });
};

startCameraBtn.addEventListener('click', async () => {
  try {
    stopCamera();
    liveStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });

    receiptVideo.srcObject = liveStream;
    receiptVideo.classList.remove('hidden');
    receiptCanvas.classList.add('hidden');
    capturePhotoBtn.disabled = false;
    retakePhotoBtn.classList.add('hidden');
    receiptBlob = undefined;
    setCameraStatus('Camera ready. Tap "Take Picture".');
  } catch (_error) {
    setCameraStatus('Camera access denied or unavailable. Please allow permission and retry.');
  }
});

capturePhotoBtn.addEventListener('click', () => {
  if (!liveStream) {
    setCameraStatus('Please start camera first.');
    return;
  }

  const width = receiptVideo.videoWidth || 1280;
  const height = receiptVideo.videoHeight || 720;
  receiptCanvas.width = width;
  receiptCanvas.height = height;
  receiptCanvas.getContext('2d').drawImage(receiptVideo, 0, 0, width, height);

  receiptCanvas.toBlob((blob) => {
    if (!blob) {
      setCameraStatus('Could not capture image. Try again.');
      return;
    }

    receiptBlob = blob;
    receiptVideo.classList.add('hidden');
    receiptCanvas.classList.remove('hidden');
    capturePhotoBtn.disabled = true;
    retakePhotoBtn.classList.remove('hidden');
    stopCamera();
    setCameraStatus('Live receipt picture captured.');
  }, 'image/jpeg', 0.9);
});

retakePhotoBtn.addEventListener('click', () => {
  receiptBlob = undefined;
  receiptCanvas.classList.add('hidden');
  receiptVideo.classList.remove('hidden');
  retakePhotoBtn.classList.add('hidden');
  capturePhotoBtn.disabled = false;
  setCameraStatus('Retake enabled. Start camera again if preview is blank.');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'message';
  message.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    if (!receiptBlob) {
      throw new Error('Please capture a live payment receipt picture before submit.');
    }

    const services = createServices();
    await ensureAnonymousSession(services.account);

    const data = new FormData(form);
    const fullName = String(data.get('fullName') || '').trim();
    const facebookLink = String(data.get('facebookLink') || '').trim();
    const admissionCopy = data.get('admissionCopy');
    const resultScreenshot = data.get('resultScreenshot');

    if (!fullName || !facebookLink || !(admissionCopy instanceof File) || !(resultScreenshot instanceof File)) {
      throw new Error('Please fill in all required fields.');
    }

    const trackingId = makeTrackingId();
    const paymentReceipt = new File([receiptBlob], `payment-receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });

    const [admissionUpload, resultUpload, receiptUpload] = await Promise.all([
      uploadImageFile(services, admissionCopy, 'admission-copy'),
      uploadImageFile(services, resultScreenshot, 'result-screenshot'),
      uploadImageFile(services, paymentReceipt, 'payment-receipt'),
    ]);

    await services.databases.createDocument(
      services.cfg.APPWRITE_DATABASE_ID,
      services.cfg.APPWRITE_COLLECTION_ID,
      services.ID.unique(),
      {
        trackingId,
        fullName,
        facebookLink,
        admissionCopyFileId: admissionUpload.$id,
        resultScreenshotFileId: resultUpload.$id,
        paymentReceiptFileId: receiptUpload.$id,
        admissionCopyUrl: buildFileViewUrl(services.cfg, admissionUpload.$id),
        resultScreenshotUrl: buildFileViewUrl(services.cfg, resultUpload.$id),
        paymentReceiptUrl: buildFileViewUrl(services.cfg, receiptUpload.$id),
        status: 'pending',
      },
      [services.Permission.read(services.Role.any())]
    );

    showSuccessWithCopy(trackingId);
    form.reset();
    receiptBlob = undefined;
    receiptCanvas.classList.add('hidden');
    receiptVideo.classList.add('hidden');
    capturePhotoBtn.disabled = true;
    retakePhotoBtn.classList.add('hidden');
    setCameraStatus('No picture captured yet.');
  } catch (error) {
    showError(error.message || 'Submission failed.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Verification Request';
  }
});

window.addEventListener('beforeunload', stopCamera);
