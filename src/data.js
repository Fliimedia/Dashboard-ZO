// Datalaag: probeert echte GA4-data via /api/ga, valt terug op demo-data
// zodat het dashboard altijd rendert.

const METRICS6 = [
  { name: "totalUsers" }, { name: "sessions" }, { name: "averageSessionDuration" },
  { name: "engagementRate" }, { name: "keyEvents" }, { name: "totalRevenue" },
];

// Periodefilter: aantal dagen per periode, en het vergelijkingsvenster
export const PERIOD_DAYS = { week: 7, maand: 30, kwartaal: 90, jaar: 365 };
export const PERIOD_LABEL = { week: "afgelopen 7 dagen", maand: "afgelopen 30 dagen", kwartaal: "afgelopen 90 dagen", jaar: "afgelopen 12 maanden" };

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
    { dateRanges: cur, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "keyEvents" }], orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }], limit: 5 }, // devices
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
  const devices = (reps[18]?.rows || []).map((r) => {
    const u = num(r, 0), s = num(r, 1), ke = num(r, 2);
    return { n: dim(r, 0), u, cr: s ? Math.round((ke / s) * 1000) / 10 : 0 };
  }).filter((d) => d.n);
  return { live: true, kpis, days, dims, countries, cities: cities.length ? cities : null, periods, funnel, flow, demografie, devices: devices.length ? devices : null, eventsFound: Object.keys(events).length > 0 };
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
    // vorm per periode: jaar heeft seizoen (jan-piek), kwartaal een lichte trend, week een duidelijk weekritme
    const seizoen = n >= 300 ? 1 + 0.35 * Math.cos(((i / n) * 2 - 0.1) * Math.PI * 2) : 1;
    const trend = n >= 60 && n < 300 ? 1 + (i / n) * 0.22 : 1;
    const weekritme = (i % 7 < 5) ? 1.08 : 0.78;
    const ruis = 1 + (((i * 13) % 40) - 20) / 420;
    const s = Math.round(470 * seizoen * trend * weekritme * ruis);
    const d = new Date(today); d.setDate(d.getDate() - (n - i));
    days.push({
      date: ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2),
      s, c: Math.max(4, Math.round(s * 0.042 + ((i % 7 < 5) ? 3 : -4))),
      e: Math.min(82, 54 + Math.round((s - 420) / 24)),
      u: Math.round(s * 0.62), w: Math.round(s * 0.042 * 33),
      spend: Math.round(s * 0.31 + ((i % 7 < 5) ? 40 : -30)),
      reach: Math.round(s * 6.4 * (1 + (((i * 7) % 30) - 15) / 300)),
    });
  }
  // KPI-totalen zijn de som van de dagreeks, zodat grafiek en scorecards altijd kloppen
  const sum = (k) => days.reduce((a, b) => a + b[k], 0);
  const curTot = { s: sum("s"), u: sum("u"), c: sum("c"), w: sum("w"),
    e: Math.round(days.reduce((a, b) => a + b.e, 0) / days.length) };
  const dprev = compare === "yoy" ? { s: .82, u: .84, c: .78, w: .80, e: .96 } :
    period === "week" ? { s: .93, u: .94, c: .90, w: .91, e: .99 } :
    period === "jaar" ? { s: .74, u: .76, c: .70, w: .72, e: .95 } : { s: .89, u: .90, c: .86, w: .87, e: .98 };
  const prevTot = { s: Math.round(curTot.s * dprev.s), u: Math.round(curTot.u * dprev.u),
    c: Math.round(curTot.c * dprev.c), w: Math.round(curTot.w * dprev.w), e: Math.round(curTot.e * dprev.e) };
  const f = n / 30;
  const yo = compare === "yoy" ? 0.88 : 1; // vorig jaar iets lager in demo
  // Deterministische verrijking: vorige-periodewaarde per rij, varieert per periode
  const seed = (str) => { let x = 0; for (const ch of String(str)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
  const enrich = (rows) => rows.map((r) => {
    const g = seed(r.n + "|" + period);
    const uFac = 1 + (((g % 46) - 22) / 100);   // bezoekers -22%..+23%
    const cFac = 1 + ((((g >>> 5) % 52) - 24) / 100); // verkopen -24%..+27%
    return { ...r, u: Math.round(r.u * f), s: Math.round(r.s * f), c: Math.round(r.c * f), w: Math.round(r.w * f),
      pu: Math.max(1, Math.round((r.u * f) / uFac)), pc: Math.max(0, Math.round((r.c * f) / cFac)) };
  });
  return {
    live: false,
    kpis: { cur: curTot, prev: prevTot },
    days,
    dims: {
      kanalen: enrich([
        { n: "Organic Search", u: 4980, s: 6113, d: 214, e: 74, c: 302, w: 9120 },
        { n: "Direct", u: 3210, s: 4026, d: 186, e: 61, c: 171, w: 5480 },
        { n: "Social", u: 2440, s: 2684, d: 98, e: 48, c: 64, w: 1710 },
        { n: "Referral", u: 1010, s: 1341, d: 172, e: 57, c: 52, w: 1590 },
        { n: "E-mail", u: 590, s: 748, d: 238, e: 69, c: 71, w: 2260 },
      ]),
      campagnes: enrich([
        { n: "zomer-actie", u: 520, s: 640, d: 196, e: 66, c: 58, w: 1980 },
        { n: "merk-always-on", u: 790, s: 980, d: 154, e: 59, c: 44, w: 1340 },
        { n: "retargeting-q2", u: 310, s: 412, d: 221, e: 71, c: 39, w: 1210 },
        { n: "nieuwsbrief-juni", u: 280, s: 344, d: 243, e: 73, c: 31, w: 960 },
      ]),
      landingspaginas: enrich([
        { n: "/home", u: 3820, s: 4630, d: 167, e: 63, c: 148, w: 4480 },
        { n: "/aanbod", u: 2280, s: 2760, d: 203, e: 70, c: 171, w: 5230 },
        { n: "/prijzen", u: 1140, s: 1385, d: 188, e: 66, c: 96, w: 2890 },
        { n: "/over-ons", u: 660, s: 790, d: 141, e: 58, c: 12, w: 340 },
        { n: "/blog", u: 540, s: 684, d: 256, e: 72, c: 9, w: 270 },
      ]),
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
      { key: "lead", name: "Lead / brochure", value: Math.round(2680 * f), source: "event", note: "Bezoekers die een brochure downloaden of hun gegevens achterlaten. Eerste blijk van interesse." },
      { key: "aanvraag", name: "Bezoek /aanvragen", value: Math.round(1190 * f), source: "event", note: "Bezoekers die de aanvraagpagina openen of het formulier starten. Serieuze intentie." },
      { key: "aankoop", name: "Aankoop", value: Math.round(622 * f), source: "event", note: "Afgeronde aanvragen, oftewel nieuwe klanten." },
    ],
    flow: {
      nodes: [{ name: "Sessies" }, { name: "/home" }, { name: "/aanbod" }, { name: "/aanvragen" }, { name: "/blog" }, { name: "Conversie" }, { name: "Exit" }],
      links: [
        { source: "Sessies", target: "/home", value: Math.round(6400 * f) },
        { source: "Sessies", target: "/aanbod", value: Math.round(4200 * f) },
        { source: "Sessies", target: "/aanvragen", value: Math.round(2600 * f) },
        { source: "Sessies", target: "/blog", value: Math.round(1700 * f) },
        { source: "/home", target: "Conversie", value: Math.round(120 * f) },
        { source: "/home", target: "Exit", value: Math.round(6280 * f) },
        { source: "/aanbod", target: "Conversie", value: Math.round(180 * f) },
        { source: "/aanbod", target: "Exit", value: Math.round(4020 * f) },
        { source: "/aanvragen", target: "Conversie", value: Math.round(280 * f) },
        { source: "/aanvragen", target: "Exit", value: Math.round(2320 * f) },
        { source: "/blog", target: "Conversie", value: Math.round(42 * f) },
        { source: "/blog", target: "Exit", value: Math.round(1658 * f) },
      ],
    },
    demografie: {
      age: [
        { n: "18-24", v: 640 }, { n: "25-34", v: 2860 }, { n: "35-44", v: 3420 },
        { n: "45-54", v: 2510 }, { n: "55-64", v: 1290 }, { n: "65+", v: 410 },
      ],
      gender: [ { n: "male", v: 6570 }, { n: "female", v: 4560 } ],
    },
    devices: [
      { n: "mobile", u: Math.round(6890 * f), cr: 3.4 },
      { n: "desktop", u: Math.round(3760 * f), cr: 5.1 },
      { n: "tablet", u: Math.round(560 * f), cr: 2.8 },
    ],
    eventsFound: false,
  };
}

// Trends: demo brand keywords.
// LET OP: geschatte volumes, geen live bron.
export const KEYWORDS_ESTIMATED = false;
export const KEYWORDS = [
  { k: "product kopen", v: 12400, c: 19 },
  { k: "merknaam", v: 8800, c: 14 },
  { k: "product vergelijken", v: 6900, c: 27 },
  { k: "beste product 2026", v: 5400, c: 42 },
  { k: "product review", v: 4700, c: 8 },
  { k: "product prijs", v: 3900, c: 12 },
  { k: "product alternatieven", v: 2800, c: 24 },
  { k: "merknaam korting", v: 2200, c: 31 },
  { k: "product ervaringen", v: 1700, c: -4 },
  { k: "product aanbieding", v: 1300, c: -9 },
];

export const SUBREDDITS = [
  { n: "r/Netherlands", m: 31, d: "+7 t.o.v. vorige maand" },
  { n: "r/marketing", m: 22, d: "+4" },
  { n: "r/smallbusiness", m: 16, d: "+2" },
  { n: "r/Entrepreneur", m: 12, d: "-1" },
  { n: "r/reviews", m: 7, d: "+1" },
];

export const SPLIT_PRODUCT = [
  { n: "Product A", c: 286, w: 9840 },
  { n: "Product B", c: 214, w: 6120 },
  { n: "Product C", c: 122, w: 4680 },
];
export const SPLIT_BEROEP = [
  { n: "Segment 1", c: 178, w: 6420 },
  { n: "Segment 2", c: 136, w: 4380 },
  { n: "Segment 3", c: 152, w: 5110 },
  { n: "Segment 4", c: 74, w: 2350 },
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

export const CLIENTS = [{ name: "Demo", id: "demo" }];

// Demo-branch: nooit echte klantdata tonen
export const FORCE_DEMO = true;

// Merk van de klant voor de brandbalk. logo:null gebruikt de wordmark van de initialen.
export const BRAND = {
  logo: null,               // uithangbord: geen vast logo, wordmark uit de merknaam
  i18n: true,               // naam, tagline, site en beschrijving komen uit het woordenboek
};

export function wordmark(name) {
  return (name || "")
    .split(/\s+/).filter(Boolean)
    .map((w) => w[0].toUpperCase()).join("").slice(0, 3);
}
