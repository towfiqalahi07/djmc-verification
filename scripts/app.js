const form = document.getElementById("verificationForm");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

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

const showMessage = (type, text) => {
  message.className = `message ${type}`;
  message.textContent = text;
};

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
    const paymentReceiptFile = formData.get("paymentReceipt");

    const [admissionCopy, resultScreenshot, paymentReceipt] = await Promise.all([
      readImageFile(admissionCopyFile),
      readImageFile(resultScreenshotFile),
      readImageFile(paymentReceiptFile),
    ]);

    const payload = {
      fullName: formData.get("fullName"),
      facebookLink: formData.get("facebookLink"),
      admissionCopy,
      resultScreenshot,
      paymentReceipt,
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
  } catch (error) {
    showMessage("error", error.message || "Unexpected error occurred.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Verification Request";
  }
});
