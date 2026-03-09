const statusForm = document.getElementById("statusForm");
const statusResult = document.getElementById("statusResult");
const statusBtn = document.getElementById("statusBtn");

const ensureApiBaseUrl = () => {
  const baseUrl = window.APP_CONFIG?.API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Portal is not configured yet. Please set API_BASE_URL in scripts/config.js");
  }
  return baseUrl;
};

const renderStatus = (status) => {
  statusResult.className = "status-result";

  if (status === "verified") {
    statusResult.classList.add("verified");
    statusResult.innerHTML = '<span class="icon">✅</span><span>You are verified.</span>';
  } else if (status === "rejected") {
    statusResult.classList.add("rejected");
    statusResult.innerHTML = '<span class="icon">❌</span><span>Your application was rejected.</span>';
  } else {
    statusResult.classList.add("pending");
    statusResult.innerHTML = '<span class="icon">⚠️</span><span>Your application is pending review.</span>';
  }
};

statusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBtn.disabled = true;
  statusBtn.textContent = "Checking...";

  try {
    const baseUrl = ensureApiBaseUrl();
    const trackingId = new FormData(statusForm).get("trackingId").toString().trim();
    const response = await fetch(`${baseUrl}/status/${encodeURIComponent(trackingId)}`);
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
