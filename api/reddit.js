// Serverless proxy voor de Reddit top-posts feed.
// Vermijdt de publieke CORS-proxy in de browser en voegt caching toe.
export default async function handler(req, res) {
  const subs = (req.query.subs || "zzp+ondernemers+geldzaken+DutchFIRE+thenetherlands").replace(/[^a-zA-Z0-9_+]/g, "");
  const t = ["all", "year", "month", "day"].includes(req.query.t) ? req.query.t : "month";
  const limit = Math.min(25, Math.max(1, parseInt(req.query.limit || "10", 10)));
  const url = "https://www.reddit.com/r/" + subs + "/top.json?limit=" + limit + "&t=" + t + "&raw_json=1";

  try {
    const r = await fetch(url, { headers: { "User-Agent": "performance-os/1.0 (by flii)" } });
    if (!r.ok) return res.status(502).json({ error: "reddit " + r.status });
    const j = await r.json();
    const posts = (j?.data?.children || []).map((c) => ({
      t: c.data.title,
      sub: "r/" + c.data.subreddit,
      score: c.data.score,
      com: c.data.num_comments,
      url: "https://www.reddit.com" + c.data.permalink,
      created: c.data.created_utc,
    }));
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ posts });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
