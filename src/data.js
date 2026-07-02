// ------------------------------------------------------------------
// Klanten. Vul hier je GA4 property per klant in. name is wat de klant
// ziet, id is de GA4 property id (het getal, niet het G-meetnummer).
// ------------------------------------------------------------------
export const CLIENTS = [
  { name: "Demo", id: "283274237" },
  // { name: "BikeFair", id: "XXXXXXXXX" },
  // { name: "TheaterThuis", id: "XXXXXXXXX" },
];

export const RANGES = [
  { id: "7d", label: "7 dagen" },
  { id: "30d", label: "30 dagen" },
  { id: "month", label: "Deze maand" },
  { id: "lastmonth", label: "Vorige maand" },
];

const DOW = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

function iso(d) { return d.toISOString().slice(0, 10); }

export function ranges(id) {
  const now = new Date();
  let s = new Date(now), e = new Date(now);
  if (id === "7d") s.setDate(now.getDate() - 7);
  else if (id === "30d") s.setDate(now.getDate() - 30);
  else if (id === "month") s = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (id === "lastmonth") { s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); }
  const days = Math.max(1, Math.round((e - s) / 86400000));
  const ps = new Date(s); ps.setDate(s.getDate() - days - 1);
  const pe = new Date(s); pe.setDate(s.getDate() - 1);
  return { cur: { startDate: iso(s), endDate: iso(e) }, prev: { startDate: iso(ps), endDate: iso(pe) }, days };
}

export function reportDefs(cur, prev) {
  const core = [{ name: "sessions" }, { name: "totalUsers" }, { name: "newUsers" }, { name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "engagementRate" }, { name: "bounceRate" }];
  return [
    { dateRanges: [cur], metrics: core },
    { dateRanges: [prev], metrics: core },
    { dateRanges: [cur], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 },
    { dateRanges: [cur], dimensions: [{ name: "sessionCampaignName" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 },
    { dateRanges: [cur], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 10 },
    { dateRanges: [cur], dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }] },
    { dateRanges: [cur], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
    { dateRanges: [cur], dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: [cur], dimensions: [{ name: "dayOfWeek" }, { name: "hour" }], metrics: [{ name: "sessions" }], limit: 200 },
  ];
}

const n = (v) => { const x = Number(v || 0); return isNaN(x) ? 0 : x; };
const rows = (r) => (r && r.rows) || [];

function totalsOf(r) {
  const rr = rows(r);
  const m = rr[0] ? rr[0].metricValues.map((x) => n(x.value)) : [0, 0, 0, 0, 0, 0, 0];
  return { sessions: m[0], users: m[1], newUsers: m[2], views: m[3], avgDur: m[4], engRate: m[5], bounceRate: m[6] };
}

export function parse(data) {
  const R = (data && data.reports) || [];
  const cur = totalsOf(R[0]), prev = totalsOf(R[1]);
  const channels = rows(R[2]).map((x) => ({ name: x.dimensionValues[0].value || "(niet ingesteld)", sessions: n(x.metricValues[0].value), users: n(x.metricValues[1].value), eng: n(x.metricValues[2].value) }));
  const campaigns = rows(R[3]).map((x) => ({ name: x.dimensionValues[0].value || "(niet ingesteld)", sessions: n(x.metricValues[0].value), users: n(x.metricValues[1].value) }));
  const pages = rows(R[4]).map((x) => ({ path: x.dimensionValues[0].value, views: n(x.metricValues[0].value), dur: n(x.metricValues[1].value) }));
  const devices = rows(R[5]).map((x) => ({ name: x.dimensionValues[0].value, sessions: n(x.metricValues[0].value) }));
  const trend = rows(R[6]).map((x) => ({ date: x.dimensionValues[0].value, sessions: n(x.metricValues[0].value), users: n(x.metricValues[1].value) }));
  const countries = rows(R[7]).map((x) => ({ name: x.dimensionValues[0].value, sessions: n(x.metricValues[0].value) }));
  const heat = rows(R[8]).map((x) => ({ dow: Number(x.dimensionValues[0].value), hour: Number(x.dimensionValues[1].value), sessions: n(x.metricValues[0].value) }));
  return { cur, prev, channels, campaigns, pages, devices, trend, countries, heat };
}

// ---------- formatters ----------
export const int = (v) => Math.round(v).toLocaleString("nl-NL");
export const pct = (v) => (v * 100).toFixed(1).replace(".", ",") + "%";
export function dur(s) { s = Math.round(s); const m = Math.floor(s / 60); return m + "m " + String(s % 60).padStart(2, "0") + "s"; }
export function delta(cur, prev) {
  if (!prev) return { t: "", cls: "flat" };
  const d = (cur - prev) / prev * 100;
  const cls = d > 0.5 ? "up" : d < -0.5 ? "down" : "flat";
  return { t: (d > 0 ? "+" : "") + d.toFixed(1).replace(".", ",") + "%", cls };
}
export function niceDate(s) { if (!s || s.length !== 8) return s; return s.slice(6, 8) + "-" + s.slice(4, 6); }
export { DOW };

// ---------- berekende inzichten ----------
export function optimizations(d) {
  const out = [];
  if (d.cur.bounceRate > 0.6) out.push("Bounce rate is " + pct(d.cur.bounceRate) + ". Kijk of de landingspagina's aansluiten op de bron van het verkeer.");
  const avgEng = d.channels.length ? d.channels.reduce((a, c) => a + c.eng, 0) / d.channels.length : 0;
  const weak = d.channels.filter((c) => c.sessions > 0 && c.eng < avgEng * 0.8).sort((a, b) => b.sessions - a.sessions)[0];
  if (weak) out.push("Kanaal " + weak.name + " brengt veel verkeer (" + int(weak.sessions) + " sessies) maar blijft achter in betrokkenheid (" + pct(weak.eng) + "). Kans om de instroom te verbeteren.");
  const mob = d.devices.find((x) => x.name === "mobile"), tot = d.devices.reduce((a, x) => a + x.sessions, 0) || 1;
  if (mob && mob.sessions / tot > 0.55) out.push("Ruim de helft van het verkeer is mobiel (" + pct(mob.sessions / tot) + "). Controleer of de mobiele ervaring op orde is.");
  if (d.pages[0]) out.push("Best bezochte pagina is " + d.pages[0].path + " (" + int(d.pages[0].views) + " weergaven). Benut die pagina voor je belangrijkste call to action.");
  const newShare = d.cur.users ? d.cur.newUsers / d.cur.users : 0;
  if (newShare > 0.7) out.push("Het aandeel nieuwe gebruikers is hoog (" + pct(newShare) + "). Werk aan terugkeer met e-mail of retargeting.");
  else if (newShare < 0.3 && d.cur.users > 0) out.push("Weinig nieuwe gebruikers (" + pct(newShare) + "). Er komt te weinig nieuw publiek binnen, kijk naar bereik.");
  if (out.length === 0) out.push("Geen directe aandachtspunten in de cijfers voor deze periode.");
  return out;
}

export function forecast(trend, days) {
  const y = trend.map((t) => t.sessions);
  const nn = y.length;
  if (nn < 3) return null;
  const xs = y.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / nn;
  const my = y.reduce((a, b) => a + b, 0) / nn;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (y[i] - my); den += (x - mx) * (x - mx); });
  const slope = den ? num / den : 0;
  const intc = my - slope * mx;
  const proj = [];
  for (let i = nn; i < nn + days; i++) proj.push(Math.max(0, Math.round(intc + slope * i)));
  return {
    curTotal: Math.round(y.reduce((a, b) => a + b, 0)),
    proj: proj.reduce((a, b) => a + b, 0),
    series: proj,
    dir: slope > 0.05 ? "stijgend" : slope < -0.05 ? "dalend" : "vlak",
  };
}
