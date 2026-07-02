import { GoogleAuth } from "google-auth-library";

// Performance OS, GA4 proxy
// Wisselt het service-account om naar een access token en haalt rapporten op
// bij de GA4 Data API. De GA4 batchRunReports API staat maximaal 5 rapporten
// per call toe, dus we knippen langere lijsten in stukken en plakken de
// resultaten weer aan elkaar in dezelfde volgorde.

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];
const CHUNK = 5;

let authClient;

function getAuth() {
  if (!authClient) {
    const raw = process.env.GA_SERVICE_ACCOUNT;
    if (!raw) throw new Error("GA_SERVICE_ACCOUNT env var ontbreekt");
    authClient = new GoogleAuth({ credentials: JSON.parse(raw), scopes: SCOPES });
  }
  return authClient;
}

function allowedProperty(id) {
  const list = (process.env.GA_ALLOWED_PROPERTIES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(id);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-secret");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      service: "performance-os-ga",
      hint: "Gebruik POST met propertyId en reports om data op te halen.",
    });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Alleen POST" });
    return;
  }

  const secret = process.env.PROXY_SECRET;
  if (secret && req.headers["x-proxy-secret"] !== secret) {
    res.status(401).json({ error: "Geen toegang" });
    return;
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const propertyId = String(body.propertyId || process.env.GA_PROPERTY_ID || "")
      .replace(/^properties\//, "")
      .trim();

    if (!propertyId) {
      res.status(400).json({ error: "propertyId ontbreekt" });
      return;
    }
    if (!allowedProperty(propertyId)) {
      res.status(403).json({ error: "Property niet toegestaan" });
      return;
    }
    if (!Array.isArray(body.reports) || body.reports.length === 0) {
      res.status(400).json({ error: "reports ontbreekt" });
      return;
    }

    const token = await (await getAuth().getClient()).getAccessToken();
    const bearer = token && token.token ? token.token : token;

    const base =
      "https://analyticsdata.googleapis.com/v1beta/properties/" +
      propertyId +
      ":batchRunReports";

    const merged = [];
    for (let i = 0; i < body.reports.length; i += CHUNK) {
      const slice = body.reports.slice(i, i + CHUNK);
      const gaRes = await fetch(base, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + bearer,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: slice }),
      });
      const data = await gaRes.json();
      if (!gaRes.ok) {
        const msg =
          data && data.error && data.error.message
            ? data.error.message
            : "Google Analytics fout";
        res.status(gaRes.status).json({ error: msg, detail: data });
        return;
      }
      (data.reports || []).forEach((r) => merged.push(r));
    }

    res.status(200).json({ reports: merged });
  } catch (e) {
    res.status(500).json({ error: e.message || "Serverfout" });
  }
}
