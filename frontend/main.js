const urlInput = document.getElementById("videoUrl");
const resolutionSelect = document.getElementById("resolution");
const downloadBtn = document.getElementById("downloadBtn");
const statusText = document.getElementById("status");
const yearSpan = document.getElementById("year");
const platformChips = document.querySelectorAll(".chip[data-platform]");

yearSpan.textContent = new Date().getFullYear().toString();

function setStatus(message, type = "info") {
  statusText.textContent = "";
  statusText.className = `status ${type}`;
  statusText.insertAdjacentHTML("beforeend", message);
}

function looksLikeUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}

function detectPlatformFromUrl(value) {
  if (!value) return "unknown";

  let url;
  try {
    url = new URL(value);
  } catch (e) {
    // Try to add https if missing
    try {
      url = new URL("https://" + value);
    } catch (err) {
      return "unknown";
    }
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return "youtube";
  }
  if (host.includes("facebook.com") || host.includes("fb.watch")) {
    return "facebook";
  }
  if (host.includes("tiktok.com")) {
    return "tiktok";
  }

  return "unknown";
}

function highlightPlatform(platform) {
  platformChips.forEach((chip) => {
    const value = chip.getAttribute("data-platform");
    if (value === platform) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

function updatePlatformState() {
  const value = urlInput.value.trim();
  const platform = detectPlatformFromUrl(value);

  if (!value) {
    highlightPlatform("none");
    setStatus("Paste a link to auto-detect the platform.", "info");
    return;
  }

  if (!looksLikeUrl(value)) {
    highlightPlatform("none");
    setStatus("This does not look like a valid URL.", "error");
    return;
  }

  if (platform === "unknown") {
    highlightPlatform("none");
    setStatus("URL looks valid but platform is <span class=\"platform-label\">unknown</span>.", "info");
  } else {
    highlightPlatform(platform);
    const label = platform.charAt(0).toUpperCase() + platform.slice(1);
    setStatus(
      `Detected platform: <span class="platform-label">${label}</span>. You can start now.`,
      "ok"
    );
  }
}

// input auto detect
["input", "blur", "change"].forEach((evt) => {
  urlInput.addEventListener(evt, updatePlatformState);
});

// button click
downloadBtn.addEventListener("click", async () => {
  const videoUrl = urlInput.value.trim();
  const resolution = resolutionSelect.value;

  if (!videoUrl) {
    setStatus("Please paste a video URL first.", "error");
    return;
  }

  if (!looksLikeUrl(videoUrl)) {
    setStatus("This does not look like a valid URL.", "error");
    return;
  }

  const platform = detectPlatformFromUrl(videoUrl);

  setStatus("Sending request to server…", "info");
  downloadBtn.disabled = true;

  try {
    // Railway backend URL ကို သင့် domain နဲ့ ပြောင်းထည့်
    const response = await fetch("https://your-railway-backend-url.com/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl, resolution, platform }),
    });

    if (!response.ok) {
      throw new Error("Server returned an error.");
    }

    const data = await response.json();

    if (data.status === "queued") {
      setStatus("Request received. Backend will handle it according to its own rules.", "ok");
    } else if (data.status === "ready" && data.downloadUrl) {
      setStatus("Your file is ready. Starting download…", "ok");
      window.location.href = data.downloadUrl;
    } else {
      setStatus(data.message || "Request completed, but no download URL returned.", "info");
    }
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong while talking to the server.", "error");
  } finally {
    downloadBtn.disabled = false;
  }
});

