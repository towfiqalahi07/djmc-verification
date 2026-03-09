const form = document.getElementById("verificationForm");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const startCameraBtn = document.getElementById("startCameraBtn");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const retakePhotoBtn = document.getElementById("retakePhotoBtn");
const cameraStatus = document.getElementById("cameraStatus");
const receiptVideo = document.getElementById("receiptVideo");
const receiptCanvas = document.getElementById("receiptCanvas");

let receiptStream;
let capturedReceiptImage;

const ensureApiUrl = () => {
  const baseUrl = window.APP_CONFIG?.GOOGLE_SCRIPT_URL?.trim();
  if (!baseUrl) {
    throw new Error("Portal is not configured yet. Please set GOOGLE_SCRIPT_URL in scripts/config.js");
  }
  return baseUrl;
};

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [, base64] = String(reader.result).split(",");
      resolve({
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        base64,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

const stopCamera = () => {
  if (receiptStream) {
    receiptStream.getTracks().forEach((track) => track.stop());
    receiptStream = undefined;
  }
};

const showMessage = (type, text) => {
  message.className = `message ${type}`;
  message.textContent = text;
};

const setCameraStatus = (text) => {
  cameraStatus.textContent = text;
};

startCameraBtn.addEventListener("click", async () => {
  try {
    stopCamera();
    receiptStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    receiptVideo.srcObject = receiptStream;
    receiptVideo.classList.remove("hidden");
    receiptCanvas.classList.add("hidden");
    capturePhotoBtn.disabled = false;
    retakePhotoBtn.classList.add("hidden");
    capturedReceiptImage = undefined;
    setCameraStatus("Camera is ready. Tap 'Take Picture'.");
  } catch (error) {
    setCameraStatus("Could not access camera. Please allow camera permission and retry.");
  }
});

capturePhotoBtn.addEventListener("click", () => {
  if (!receiptStream) {
    setCameraStatus("Start camera first.");
    return;
  }

  const width = receiptVideo.videoWidth || 1280;
  const height = receiptVideo.videoHeight || 720;
  receiptCanvas.width = width;
  receiptCanvas.height = height;
  const ctx = receiptCanvas.getContext("2d");
  ctx.drawImage(receiptVideo, 0, 0, width, height);

  const dataUrl = receiptCanvas.toDataURL("image/jpeg", 0.9);
  const [, base64] = dataUrl.split(",");
  capturedReceiptImage = {
    fileName: `payment-receipt-${Date.now()}.jpg`,
    mimeType: "image/jpeg",
    base64,
  };

  receiptVideo.classList.add("hidden");
  receiptCanvas.classList.remove("hidden");
  retakePhotoBtn.classList.remove("hidden");
  stopCamera();
  capturePhotoBtn.disabled = true;
  setCameraStatus("Picture captured successfully.");
});

retakePhotoBtn.addEventListener("click", () => {
  capturedReceiptImage = undefined;
  receiptCanvas.classList.add("hidden");
  receiptVideo.classList.remove("hidden");
  retakePhotoBtn.classList.add("hidden");
  capturePhotoBtn.disabled = false;
  setCameraStatus("Retake mode enabled. Start camera again if needed.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "message";
  message.textContent = "";

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const baseUrl = ensureApiUrl();
    const formData = new FormData(form);

    const admissionCopyFile = formData.get("admissionCopy");
    const resultScreenshotFile = formData.get("resultScreenshot");

    if (!capturedReceiptImage) {
      throw new Error("Please take a live picture of your payment receipt before submitting.");
    }

    const [admissionCopy, resultScreenshot] = await Promise.all([
      readImageFile(admissionCopyFile),
      readImageFile(resultScreenshotFile),
    ]);

    const payload = {
      fullName: formData.get("fullName"),
      facebookLink: formData.get("facebookLink"),
      admissionCopy,
      resultScreenshot,
      paymentReceipt: capturedReceiptImage,
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to submit application.");
    }

    showMessage(
      "success",
      `Submitted successfully. Your tracking ID is ${data.trackingId}. Save this ID; admins can DM you this ID as well.`
    );
    form.reset();
    capturedReceiptImage = undefined;
    receiptCanvas.classList.add("hidden");
    receiptVideo.classList.add("hidden");
    retakePhotoBtn.classList.add("hidden");
    capturePhotoBtn.disabled = true;
    setCameraStatus("No picture captured yet.");
  } catch (error) {
    showMessage("error", error.message || "Unexpected error occurred.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Verification Request";
  }
});

window.addEventListener("beforeunload", () => {
  stopCamera();
});
