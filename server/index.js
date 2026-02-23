require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── Auth Token ────────────────────────────────────────────────────────────────
app.post("/api/auth/token", async (req, res) => {
  const { userId, password, apiKey } = req.body;

  if (!userId || !password || !apiKey) {
    return res.status(400).json({ error: "userId, password, and apiKey are required." });
  }

  try {
    const upstream = await fetch("https://api.oceanio.com/authentication/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ user_id: userId, password }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Auth proxy error:", err.message);
    return res.status(502).json({ error: "Failed to reach Oceanio auth endpoint." });
  }
});

// ─── Track ─────────────────────────────────────────────────────────────────────
const TRACK_URLS = {
  bl: (ref) =>
    `https://api.oceanio.com/v2/transports/bill_of_lading_number/${encodeURIComponent(ref)}/events`,
  booking: (ref) =>
    `https://api.oceanio.com/v2/transports/carrier_booking_reference/${encodeURIComponent(ref)}/events`,
  container: (ref) =>
    `https://api.oceanio.com/v3/equipments/${encodeURIComponent(ref)}/events`,
};

app.get("/api/track", async (req, res) => {
  const { type, reference, token, apiKey } = req.query;

  if (!type || !reference || !token || !apiKey) {
    return res.status(400).json({ error: "type, reference, token, and apiKey are required." });
  }

  const urlBuilder = TRACK_URLS[type];
  if (!urlBuilder) {
    return res.status(400).json({ error: `Invalid type "${type}". Use bl, booking, or container.` });
  }

  try {
    const trackUrl = new URL(urlBuilder(reference));
    trackUrl.searchParams.set("add_historic", "false");
    trackUrl.searchParams.set("page", "1");
    trackUrl.searchParams.set("page_size", "10");

    const upstream = await fetch(trackUrl.toString(), {
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-api-key": apiKey,
      },
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Track proxy error:", err.message);
    return res.status(502).json({ error: "Failed to reach Oceanio tracking endpoint." });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Oceanio proxy server running on http://localhost:${PORT}`);
});
