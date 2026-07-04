// Datalaag: probeert echte GA4-data via /api/ga, valt terug op demo-data
// zodat het dashboard altijd rendert.

const METRICS6 = [
  { name: "totalUsers" }, { name: "sessions" }, { name: "averageSessionDuration" },
  { name: "engagementRate" }, { name: "keyEvents" }, { name: "totalRevenue" },
];

// Periodefilter: aantal dagen per periode, en het vergelijkingsvenster
export const PERIOD_DAYS = { week: 7, maand: 30, kwartaal: 90, jaar: 365 };

function ranges(period, compare) {
  const n = PERIOD_DAYS[period] || 30;
  const cur = [{ startDate: n + "daysAgo", endDate: "yesterday" }];
  let prev;
  if (compare === "yoy") {
    prev = [{ startDate: (n + 365) + "daysAgo", endDate: "366daysAgo" }];
  } else {
    prev = [{ startDate: (2 * n) + "daysAgo", endDate: (n + 1) + "daysAgo" }];
  }
  return { cur, prev, n };
}

export function buildReports(period = "maand", compare = "prev") {
  const { cur, prev, n } = ranges(period, compare);
  return [
    { dateRanges: cur, metrics: METRICS6 },
    { dateRanges: prev, metrics: METRICS6 },
    { dateRanges: cur, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "keyEvents" }, { name: "engagementRate" }, { name: "totalUsers" }, { name: "totalRevenue" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: n + 5 },
    { dateRanges: cur, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: METRICS6, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: cur, dimensions: [{ name: "sessionCampaignName" }], metrics: METRICS6, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: cur, dimensions: [{ name: "landingPage" }], metrics: METRICS6, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: cur, dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }, { name: "engagementRate" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 12 },
    { dateRanges: cur, dimensions: [{ name: "city" }], metrics: [{ name: "sessions" }, { name: "engagementRate" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    // vaste cadans-vensters voor de Forecast-trendtabel, onafhankelijk van het periodefilter
    { dateRanges: [{ startDate: "30daysAgo", endDate: "yesterday" }], metrics: METRICS6 },   // mom cur
    { dateRanges: [{ startDate: "60daysAgo", endDate: "31daysAgo" }], metrics: METRICS6 },    // mom base
    { dateRanges: [{ startDate: "90daysAgo", endDate: "yesterday" }], metrics: METRICS6 },    // qoq cur
    { dateRanges: [{ startDate: "180daysAgo", endDate: "91daysAgo" }], metrics: METRICS6 },   // qoq base
    { dateRanges: [{ startDate: "365daysAgo", endDate: "yesterday" }], metrics: METRICS6 },   // yoy cur
    { dateRanges: [{ startDate: "730daysAgo", endDate: "366daysAgo" }], metrics: METRICS6 },  // yoy base
    { dateRanges: cur, dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 25 }, // funnel-events
    { dateRanges: cur, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }, { name: "keyEvents" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 12 }, // flow
    { dateRanges: cur, dimensions: [{ name: "userAgeBracket" }], metrics: [{ name: "sessions" }], limit: 10 }, // demografie leeftijd (vereist Signals)
    { dateRanges: cur, dimensions: [{ name: "userGender" }], metrics: [{ name: "sessions" }], limit: 5 },      // demografie geslacht (vereist Signals)
  ];
}

function num(row, i) { return Number(row?.metricValues?.[i]?.value || 0); }
function dim(row, i) { return row?.dimensionValues?.[i]?.value || ""; }

function mapRows(report) {
  return (report?.rows || []).map((r) => ({
    n: dim(r, 0),
    u: num(r, 0), s: num(r, 1), d: num(r, 2),
    e: Math.round(num(r, 3) * 100), c: num(r, 4), w: Math.round(num(r, 5)),
  }));
}

export async function fetchData(propertyId, period = "maand", compare = "prev") {
  const res = await fetch("/api/ga", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, reports: buildReports(period, compare) }),
  });
  if (!res.ok) throw new Error("ga " + res.status);
  const out = await res.json();
  const reps = out.reports || out;

  const tc = reps[0]?.rows?.[0], tp = reps[1]?.rows?.[0];
  const kpis = {
    cur: { u: num(tc, 0), s: num(tc, 1), d: num(tc, 2), e: Math.round(num(tc, 3) * 100), c: num(tc, 4), w: num(tc, 5), nu: 0 },
    prev: { u: num(tp, 0), s: num(tp, 1), e: Math.round(num(tp, 3) * 100), c: num(tp, 4) },
  };
  const days = (reps[2]?.rows || []).map((r) => ({
    date: dim(r, 0).slice(6, 8) + "-" + dim(r, 0).slice(4, 6),
    s: num(r, 0), c: num(r, 1), e: Math.round(num(r, 2) * 100),
    u: num(r, 3), w: num(r, 4),
  }));
  const dims = {
    kanalen: mapRows(reps[3]),
    campagnes: mapRows(reps[4]).filter((r) => r.n && r.n !== "(not set)"),
    landingspaginas: mapRows(reps[5]),
  };
  const countries = (reps[6]?.rows || [])
    .map((r) => ({ name: dim(r, 0), value: num(r, 0), e: Math.round(num(r, 1) * 100) }))
    .filter((c) => c.name && c.name !== "(not set)");
  const cities = (reps[7]?.rows || []).map((r) => {
    const nm = dim(r, 0); const co = CITY_COORDS[nm];
    return co ? { name: nm, value: [co[0], co[1], num(r, 0)], e: Math.round(num(r, 1) * 100) } : null;
  }).filter(Boolean);
  // Forecast-trendtabel: echte MoM, QoQ, YoY uit vaste vensters
  const tot = (row) => row ? { u: num(row,0), s: num(row,1), c: num(row,4), w: num(row,5) } : null;
  const cad = (ci, bi) => ({ cur: tot(reps[ci]?.rows?.[0]), base: tot(reps[bi]?.rows?.[0]) });
  const periods = { mom: cad(8,9), qoq: cad(10,11), yoy: cad(12,13) };

  // Funnel-events: zoek herkenbare eventnamen, val terug op afleiding
  const events = {};
  (reps[14]?.rows || []).forEach((r) => { events[dim(r, 0)] = num(r, 0); });
  const pick = (names) => { for (const nm of names) if (events[nm] != null) return events[nm]; return null; };
  const funnel = buildFunnel(kpis.cur, events, pick);

  // Flow: echte paginapaden met weergaven en conversies
  const pages = (reps[15]?.rows || []).map((r) => ({ p: dim(r, 0), views: num(r, 0), conv: num(r, 1) }));
  const flow = buildFlow(kpis.cur, pages);

  // Demografie alleen als GA (Signals) echt data teruggeeft
  const age = (reps[16]?.rows || []).map((r) => ({ n: dim(r, 0), v: num(r, 0) })).filter((x) => x.n && x.n !== "unknown");
  const gender = (reps[17]?.rows || []).map((r) => ({ n: dim(r, 0), v: num(r, 0) })).filter((x) => x.n && x.n !== "unknown");
  const demografie = (age.length || gender.length) ? { age, gender } : null;
  return { live: true, kpis, days, dims, countries, cities: cities.length ? cities : null, periods, funnel, flow, demografie, eventsFound: Object.keys(events).length > 0 };
}

// Bouw een 4-staps funnel uit GA4-events, met afgeleide terugval per stap.
// GA4 heeft geen kant-en-klare funnel; we mappen op gangbare eventnamen.
export function buildFunnel(cur, events, pick) {
  const sessions = cur.s || 0;
  const lead = pick(["generate_lead", "brochure_download", "file_download", "download"]);
  const aanvraag = pick(["begin_checkout", "form_start", "aanvraag_start", "view_item"]);
  const aankoop = pick(["purchase", "aanvraag_afgerond", "submit_application"]) ?? cur.c;
  const steps = [
    { key: "sessie", name: "Sessie", value: sessions, source: "sessions",
      note: "Alle sessies in de periode. De bovenkant van de funnel." },
    { key: "lead", name: "Lead / brochure", value: lead != null ? lead : Math.round(sessions * 0.18), source: lead != null ? "event" : "schatting",
      note: "Bezoekers die een brochure downloaden of hun gegevens achterlaten. Eerste blijk van interesse." },
    { key: "aanvraag", name: "Bezoek /aanvragen", value: aanvraag != null ? aanvraag : Math.round(sessions * 0.08), source: aanvraag != null ? "event" : "schatting",
      note: "Bezoekers die de aanvraagpagina openen of het formulier starten. Serieuze intentie." },
    { key: "aankoop", name: "Aankoop", value: aankoop != null ? aankoop : Math.round(sessions * 0.04), source: aankoop != null ? "event" : "schatting",
      note: "Afgeronde aanvragen, oftewel nieuwe klanten." },
  ];
  return steps;
}

// Bouw de flow uit echte paginapaden: landing naar meest bezochte vervolgpagina naar conversie.
export function buildFlow(cur, pages) {
  if (!pages || !pages.length) return null;
  const norm = (p) => (p === "/" ? "/home" : p.split("?")[0]);
  const top = pages.slice(0, 4).map((x) => ({ p: norm(x.p), views: x.views, conv: x.conv }));
  const totalViews = top.reduce((a, b) => a + b.views, 0) || 1;
  const sessions = cur.s || totalViews;
  const conv = cur.c || 0;
  const nodes = [{ name: "Sessies" }];
  const links = [];
  top.forEach((pg) => {
    if (!nodes.find((n) => n.name === pg.p)) nodes.push({ name: pg.p });
    links.push({ source: "Sessies", target: pg.p, value: Math.round(sessions * (pg.views / totalViews)) });
  });
  nodes.push({ name: "Conversie" }, { name: "Exit" });
  const convTotal = top.reduce((a, b) => a + b.conv, 0) || 1;
  top.forEach((pg) => {
    const pgConv = Math.round(conv * (pg.conv / convTotal));
    const pgSessions = Math.round(sessions * (pg.views / totalViews));
    links.push({ source: pg.p, target: "Conversie", value: Math.max(0, pgConv) });
    links.push({ source: pg.p, target: "Exit", value: Math.max(0, pgSessions - pgConv) });
  });
  return { nodes, links };
}

// ---------- demo ----------
const BASE = [420,510,480,560,610,470,390,540,620,700,660,720,540,470,500,560,590,620,580,610,640,690,600,520,480,530,570,610,650,700];

export function demoData(period = "maand", compare = "prev") {
  const n = PERIOD_DAYS[period] || 30;
  const today = new Date(2026, 6, 2);
  const days = [];
  for (let i = 0; i < n; i++) {
    const s = BASE[i % BASE.length] + ((i * 13) % 40) - 20;
    const d = new Date(today); d.setDate(d.getDate() - (n - i));
    days.push({
      date: ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2),
      s, c: Math.max(8, Math.round(s * 0.045 + ((i % 7 < 5) ? 4 : -5))),
      e: 56 + Math.round((s - 390) / 22),
      u: Math.round(s * 0.62), w: Math.round(s * 0.045 * 33),
    });
  }
  const f = n / 30;
  const yo = compare === "yoy" ? 0.88 : 1; // vorig jaar iets lager in demo
  return {
    live: false,
    kpis: {
      cur: { u: Math.round(9210 * f), s: Math.round(14912 * f), e: 68, c: Math.round(622 * f), w: Math.round(20640 * f), nu: Math.round(3052 * f) },
      prev: { u: Math.round(8770 * f * yo), s: Math.round(13314 * f * yo), e: 63, c: Math.round(540 * f * yo) },
    },
    days,
    dims: {
      kanalen: [
        { n: "Organic Search", u: 4980, s: 6113, d: 214, e: 74, c: 302, w: 9120 },
        { n: "Direct", u: 3210, s: 4026, d: 186, e: 61, c: 171, w: 5480 },
        { n: "Social", u: 2440, s: 2684, d: 98, e: 48, c: 64, w: 1710 },
        { n: "Referral", u: 1010, s: 1341, d: 172, e: 57, c: 52, w: 1590 },
        { n: "E-mail", u: 590, s: 748, d: 238, e: 69, c: 71, w: 2260 },
      ],
      campagnes: [
        { n: "zomer-actie", u: 520, s: 640, d: 196, e: 66, c: 58, w: 1980 },
        { n: "merk-always-on", u: 790, s: 980, d: 154, e: 59, c: 44, w: 1340 },
        { n: "retargeting-q2", u: 310, s: 412, d: 221, e: 71, c: 39, w: 1210 },
        { n: "nieuwsbrief-juni", u: 280, s: 344, d: 243, e: 73, c: 31, w: 960 },
      ],
      landingspaginas: [
        { n: "/home", u: 3820, s: 4630, d: 167, e: 63, c: 148, w: 4480 },
        { n: "/aanbod", u: 2280, s: 2760, d: 203, e: 70, c: 171, w: 5230 },
        { n: "/prijzen", u: 1140, s: 1385, d: 188, e: 66, c: 96, w: 2890 },
        { n: "/over-ons", u: 660, s: 790, d: 141, e: 58, c: 12, w: 340 },
        { n: "/blog", u: 540, s: 684, d: 256, e: 72, c: 9, w: 270 },
      ],
    },
    countries: [
      { name: "Netherlands", value: 6204, e: 71 }, { name: "Germany", value: 1887, e: 64 },
      { name: "Belgium", value: 1402, e: 66 }, { name: "United States", value: 912, e: 58 },
      { name: "United Kingdom", value: 688, e: 61 }, { name: "France", value: 340, e: 55 }, { name: "Spain", value: 210, e: 52 },
    ],
    cities: CITIES.map((c, i) => ({ name: c.name, value: [c.value[0], c.value[1], Math.round(c.value[2] * f)], e: 60 + (i * 4) % 15 })),
    periods: {
      mom: { cur: { u: 9210, s: 14912, c: 622, w: 20640 }, base: { u: 8770, s: 13314, c: 556, w: 18760 } },
      qoq: { cur: { u: 27100, s: 43800, c: 1840, w: 60200 }, base: { u: 24800, s: 40100, c: 1690, w: 55100 } },
      yoy: { cur: { u: 104000, s: 168000, c: 7180, w: 238000 }, base: { u: 86000, s: 139000, c: 5980, w: 196000 } },
    },
    funnel: [
      { key: "sessie", name: "Sessie", value: Math.round(14912 * f), source: "sessions", note: "Alle sessies in de periode. De bovenkant van de funnel." },
      { key: "lead", name: "Lead / brochure", value: Math.round(2680 * f), source: "schatting", note: "Bezoekers die een brochure downloaden of hun gegevens achterlaten. Eerste blijk van interesse." },
      { key: "aanvraag", name: "Bezoek /aanvragen", value: Math.round(1190 * f), source: "schatting", note: "Bezoekers die de aanvraagpagina openen of het formulier starten. Serieuze intentie." },
      { key: "aankoop", name: "Aankoop", value: Math.round(622 * f), source: "schatting", note: "Afgeronde aanvragen, oftewel nieuwe klanten." },
    ],
    flow: {
      nodes: [{ name: "Sessies" }, { name: "/home" }, { name: "/aanbod" }, { name: "/aanvragen" }, { name: "/broodfonds-vs-aov" }, { name: "Conversie" }, { name: "Exit" }],
      links: [
        { source: "Sessies", target: "/home", value: Math.round(6400 * f) },
        { source: "Sessies", target: "/aanbod", value: Math.round(4200 * f) },
        { source: "Sessies", target: "/aanvragen", value: Math.round(2600 * f) },
        { source: "Sessies", target: "/broodfonds-vs-aov", value: Math.round(1700 * f) },
        { source: "/home", target: "Conversie", value: Math.round(120 * f) },
        { source: "/home", target: "Exit", value: Math.round(6280 * f) },
        { source: "/aanbod", target: "Conversie", value: Math.round(180 * f) },
        { source: "/aanbod", target: "Exit", value: Math.round(4020 * f) },
        { source: "/aanvragen", target: "Conversie", value: Math.round(280 * f) },
        { source: "/aanvragen", target: "Exit", value: Math.round(2320 * f) },
        { source: "/broodfonds-vs-aov", target: "Conversie", value: Math.round(42 * f) },
        { source: "/broodfonds-vs-aov", target: "Exit", value: Math.round(1658 * f) },
      ],
    },
    demografie: null,
    eventsFound: false,
  };
}

// Trends: brand keywords voor zelfstandigondernemers.nl.
// LET OP: geschatte volumes, geen live bron. Vervang fetchKeywords() zodra Ahrefs/DataForSEO gekoppeld is.
export const KEYWORDS_ESTIMATED = true;
export const KEYWORDS = [
  { k: "aov zzp", v: 14800, c: 22 },
  { k: "arbeidsongeschiktheidsverzekering zzp", v: 9900, c: 18 },
  { k: "verplichte aov zzp", v: 8100, c: 64 },
  { k: "aov verplicht 2027", v: 6600, c: 85 },
  { k: "broodfonds", v: 5400, c: -6 },
  { k: "aov kosten zzp", v: 4400, c: 15 },
  { k: "aov vergelijken", v: 3600, c: 9 },
  { k: "aov alternatieven zzp", v: 2900, c: 31 },
  { k: "zelfstandigondernemers.nl", v: 1900, c: 12 },
  { k: "crowdsurance", v: 1300, c: -14 },
];

export const SUBREDDITS = [
  { n: "r/zzp", m: 38, d: "+9 t.o.v. vorige maand" },
  { n: "r/ondernemers", m: 24, d: "+6" },
  { n: "r/geldzaken", m: 17, d: "+3" },
  { n: "r/DutchFIRE", m: 11, d: "-2" },
  { n: "r/thenetherlands", m: 8, d: "+1" },
];

export const SPLIT_PRODUCT = [
  { n: "AOV Compleet", c: 286, w: 9840 },
  { n: "AOV Instap", c: 214, w: 6120 },
  { n: "AOV Flex", c: 122, w: 4680 },
];
export const SPLIT_BEROEP = [
  { n: "Bouw", c: 178, w: 6420 },
  { n: "Zorg", c: 136, w: 4380 },
  { n: "IT en creatief", c: 152, w: 5110 },
  { n: "Transport", c: 74, w: 2350 },
  { n: "Overig", c: 82, w: 2380 },
];

export const CITY_COORDS = {
  Amsterdam:[4.9041,52.3676], Rotterdam:[4.4777,51.9244], "The Hague":[4.3007,52.0705],
  "Den Haag":[4.3007,52.0705], Utrecht:[5.1214,52.0907], Eindhoven:[5.4697,51.4416],
  Groningen:[6.5665,53.2194], Tilburg:[5.0913,51.5606], Almere:[5.2647,52.3508],
  Breda:[4.7683,51.5719], Nijmegen:[5.8372,51.8126], Haarlem:[4.6462,52.3874],
  Arnhem:[5.8987,51.9851], Amersfoort:[5.3878,52.1561], "'s-Hertogenbosch":[5.2913,51.6978],
};

export const CITIES = [
  { name: "Amsterdam", value: [4.9041, 52.3676, 2140] },
  { name: "Rotterdam", value: [4.4777, 51.9244, 1120] },
  { name: "Den Haag", value: [4.3007, 52.0705, 760] },
  { name: "Utrecht", value: [5.1214, 52.0907, 690] },
  { name: "Eindhoven", value: [5.4697, 51.4416, 480] },
];

export const CLIENTS = [{ name: "Demo", id: "283274237" }];

// Merk van de klant voor de brandbalk. logo:null gebruikt de wordmark van de initialen.
export const BRAND = {
  name: "Zelfstandig Ondernemers",
  site: "zelfstandigondernemers.nl",
  logo: "/zo-logo.png",
  tagline: "Crowdsurance voor ondernemers",
  description: "Strategie, beheer en optimalisatie van performance media",
};

export function wordmark(name) {
  return (name || "")
    .split(/\s+/).filter(Boolean)
    .map((w) => w[0].toUpperCase()).join("").slice(0, 3);
}
