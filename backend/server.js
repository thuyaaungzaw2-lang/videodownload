const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// ဒီနေရာမှာ frontend origin ကို env နဲ့ထိန်းချင်ရင် သုံးလို့ရမယ်
// Railway မှာ ALLOWED_ORIGINS ကို set လိုက်ရင် okay
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // mobile app / curl / server-side request တွေအတွက် origin မပါတဲ့အခါ
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS: " + origin));
    },
  })
);

app.use(express.json());
app.use(morgan("tiny"));

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

// Health / info route
app.get("/", (req, res) => {
  res.json({
    name: "All-in-One Video Helper Backend",
    author: "Thu Ya Aung Zaw",
    message:
      "Backend is running. Implement your own processing / download logic according to each platform's rules.",
  });
});

// Main API – auto generate download link
app.post("/api/request", async (req, res) => {
  const { videoUrl, resolution = "auto", platform } = req.body || {};

  if (!videoUrl || !looksLikeUrl(videoUrl)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid or missing video URL.",
    });
  }

  const detectedPlatform = detectPlatformFromUrl(videoUrl);
  const clientPlatform = (platform || "").toLowerCase();

  if (detectedPlatform === "unknown") {
    console.warn("Unknown platform for URL:", videoUrl);
  }

  if (
    clientPlatform &&
    detectedPlatform !== "unknown" &&
    clientPlatform !== detectedPlatform
  ) {
    console.warn("Platform mismatch:", {
      fromClient: clientPlatform,
      inferred: detectedPlatform,
      url: videoUrl,
    });
  }

  console.log("Incoming request:", {
    videoUrl,
    resolution,
    detectedPlatform,
  });

  // ❗ ဒီနေရာက ပြင်ရမယ့်အချက်တစ်ခု
  // ကိုယ် အမြဲ down လိုချင်တဲ့ mp4 ဖိုင် URL ကိုဒီမှာထည့်
  // (ကိုယ်ပိုင် file server / own content ဖြစ်ရမယ်)
 const demoDownloadUrl = "https://thuyaaungzaw2-lang.github.io/videodownload/videos/myvideo.mp4"; 

  return res.json({
    status: "ready",
    message: "Your file is ready for download.",
    downloadUrl: demoDownloadUrl,
    info: {
      videoUrl,
      requestedResolution: resolution,
      platform:
        detectedPlatform === "unknown"
          ? clientPlatform || "unknown"
          : detectedPlatform,
    },
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found.",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
