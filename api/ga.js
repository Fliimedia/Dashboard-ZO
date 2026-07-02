import { GoogleAuth } from "google-auth-library";

// Flii GA4 proxy
// Houdt het Google service-account vast, wisselt dat om naar een access token,
// en stuurt batch-rapporten door naar de GA4 Data API.
// De frontend praat alleen met deze functie, nooit rechtstreeks met Google.

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

let authClient;

function getAuth() {
  if (!authClient) {
    const raw = process.env.GA_SERVICE_ACCOUNT;
    if (!raw) throw new Error("GA_SERVICE_ACCOUNT env var ontbreekt");
    authClient = new GoogleAuth({
      credentials: JSON.parse(raw),
      scopes: SCOPES,
    });
  }
  return authClient;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-secret");

  if (req.method === "OPTIONS") {
    res.status(204).end();
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
    if (!Array.isArray(body.reports) || body.reports.length === 0) {
      res.status(400).json({ error: "reports ontbreekt" });
      return;
    }

    const token = await (await getAuth().getClient()).getAccessToken();
    const bearer = token && token.token ? token.token : token;

    const url =
      "https://analyticsdata.googleapis.com/v1beta/properties/" +
      propertyId +
      ":batchRunReports";

    const gaRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + bearer,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: body.reports }),
    });

    const data = await gaRes.json();

    if (!gaRes.ok) {
      const msg = data && data.error && data.error.message
        ? data.error.message
        : "Google Analytics fout";
      res.status(gaRes.status).json({ error: msg, detail: data });
      return;
    }

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Serverfout" });
  }
}
