const statusForm = document.getElementById("statusForm");
const statusResult = document.getElementById("statusResult");
const statusBtn = document.getElementById("statusBtn");

const ensureApiUrl = () => {
  const baseUrl = window.APP_CONFIG?.GOOGLE_SCRIPT_URL?.trim();
  if (!baseUrl) {
    throw new Error("Portal is not configured yet. Please set GOOGLE_SCRIPT_URL in scripts/config.js");
  }
  return baseUrl;
};

const renderStatus = (status) => {
  statusResult.className = "status-result";

  if (status === "verified") {
    statusResult.classList.add("verified");
    statusResult.innerHTML = '<span class="icon">✅</span><span>You are verified.</span>';
    return;
  }

  if (status === "rejected") {
    statusResult.classList.add("rejected");
    statusResult.innerHTML = '<span class="icon">❌</span><span>Your application was rejected.</span>';
    return;
  }

  statusResult.classList.add("pending");
  statusResult.innerHTML = '<span class="icon">⚠️</span><span>Your application is pending review.</span>';
};

statusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBtn.disabled = true;
  statusBtn.textContent = "Checking...";

  try {
    const baseUrl = ensureApiUrl();
    const trackingId = new FormData(statusForm).get("trackingId").toString().trim();

    const response = await fetch(`${baseUrl}?action=status&trackingId=${encodeURIComponent(trackingId)}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not find tracking ID.");
    }

    renderStatus(data.status);
  } catch (error) {
    statusResult.className = "status-result rejected";
    statusResult.innerHTML = `<span class="icon">❌</span><span>${error.message || "Unable to fetch status."}</span>`;
  } finally {
    statusBtn.disabled = false;
    statusBtn.textContent = "Check Status";
  }
});
