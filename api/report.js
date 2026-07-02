// Performance OS, AI rapport-endpoint
// Roept de Anthropic API server-side aan met jouw eigen sleutel, zodat de
// sleutel nooit in de browser komt. Zonder sleutel geeft dit endpoint netjes
// terug dat de functie uit staat, en toont de app de berekende inzichten zonder
// geschreven verhaal.

const VERSION = "2023-06-01";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Alleen POST" });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(200).json({ ok: false, reason: "no_key" });
    return;
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const facts = String(body.facts || "").slice(0, 6000);
    const type = String(body.type || "Maandrapport");
    const client = String(body.client || "de klant");
    const model = process.env.CLAUDE_MODEL || "claude-sonnet-5";

    const prompt =
      "Je bent data-analist bij Flii Media en schrijft voor " + client + ". " +
      "Hieronder staan echte cijfers uit Google Analytics 4. Schrijf een bondig, " +
      "zakelijk " + type + " in het Nederlands. Verzin geen getallen, gebruik alleen " +
      "wat hier staat. Structuur: korte duiding van de kerncijfers, de belangrijkste " +
      "kanalen, de trend, en drie concrete aanbevelingen. Schrijf voor een klant, niet " +
      "technisch. Gebruik geen em-dashes en geen en-dashes, alleen gewone leestekens.\n\n" +
      "Cijfers: " + facts;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : "API fout";
      res.status(r.status).json({ ok: false, error: msg });
      return;
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    res.status(200).json({ ok: true, text });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Serverfout" });
  }
}
