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
let capturedReceiptBlob;

const ensureApiBaseUrl = () => {
  const baseUrl = window.APP_CONFIG?.API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Portal is not configured yet. Please set API_BASE_URL in scripts/config.js");
  }
  return baseUrl;
};

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
    receiptStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    receiptVideo.srcObject = receiptStream;
    receiptVideo.classList.remove("hidden");
    receiptCanvas.classList.add("hidden");
    capturePhotoBtn.disabled = false;
    retakePhotoBtn.classList.add("hidden");
    capturedReceiptBlob = undefined;
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
  receiptCanvas.getContext("2d").drawImage(receiptVideo, 0, 0, width, height);

  receiptCanvas.toBlob(
    (blob) => {
      if (!blob) {
        setCameraStatus("Could not capture photo. Please retry.");
        return;
      }
      capturedReceiptBlob = blob;
      receiptVideo.classList.add("hidden");
      receiptCanvas.classList.remove("hidden");
      retakePhotoBtn.classList.remove("hidden");
      capturePhotoBtn.disabled = true;
      stopCamera();
      setCameraStatus("Picture captured successfully.");
    },
    "image/jpeg",
    0.9
  );
});

retakePhotoBtn.addEventListener("click", () => {
  capturedReceiptBlob = undefined;
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
    const baseUrl = ensureApiBaseUrl();
    const data = new FormData(form);

    if (!capturedReceiptBlob) {
      throw new Error("Please take a live picture of your payment receipt before submitting.");
    }

    data.append("paymentReceipt", capturedReceiptBlob, `payment-receipt-${Date.now()}.jpg`);

    const response = await fetch(`${baseUrl}/submit`, { method: "POST", body: data });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to submit application.");
    }

    showMessage("success", `Submitted successfully. Your tracking ID is ${result.trackingId}. Save this ID for status check.`);
    form.reset();
    capturedReceiptBlob = undefined;
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

window.addEventListener("beforeunload", stopCamera);
