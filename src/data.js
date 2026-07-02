// Datalaag: probeert echte GA4-data via /api/ga, valt terug op demo-data
// zodat het dashboard altijd rendert.

const METRICS6 = [
  { name: "totalUsers" }, { name: "sessions" }, { name: "averageSessionDuration" },
  { name: "engagementRate" }, { name: "keyEvents" }, { name: "totalRevenue" },
];

const RANGE_CUR = [{ startDate: "30daysAgo", endDate: "yesterday" }];
const RANGE_PREV = [{ startDate: "60daysAgo", endDate: "31daysAgo" }];

export function buildReports() {
  return [
    { dateRanges: RANGE_CUR, metrics: METRICS6 },
    { dateRanges: RANGE_PREV, metrics: METRICS6 },
    { dateRanges: RANGE_CUR, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "keyEvents" }, { name: "engagementRate" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: 31 },
    { dateRanges: RANGE_CUR, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: METRICS6, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: RANGE_CUR, dimensions: [{ name: "sessionCampaignName" }], metrics: METRICS6, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: RANGE_CUR, dimensions: [{ name: "landingPage" }], metrics: METRICS6, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: RANGE_CUR, dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 },
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

export async function fetchData(propertyId) {
  const res = await fetch("/api/ga", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, reports: buildReports() }),
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
  }));
  const dims = {
    kanalen: mapRows(reps[3]),
    campagnes: mapRows(reps[4]).filter((r) => r.n && r.n !== "(not set)"),
    landingspaginas: mapRows(reps[5]),
  };
  const countries = (reps[6]?.rows || []).map((r) => ({ name: dim(r, 0), value: num(r, 0) }));
  return { live: true, kpis, days, dims, countries };
}

// ---------- demo ----------
const BASE = [420,510,480,560,610,470,390,540,620,700,660,720,540,470,500,560,590,620,580,610,640,690,600,520,480,530,570,610,650,700];

export function demoData() {
  const days = BASE.map((s, i) => {
    const d = new Date(2026, 5, 1 + i);
    return {
      date: ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2),
      s, c: Math.max(8, Math.round(s * 0.045 + ((i % 7 < 5) ? 4 : -5))),
      e: 56 + Math.round((s - 390) / 22),
    };
  });
  return {
    live: false,
    kpis: {
      cur: { u: 9210, s: 14912, e: 68, c: 622, w: 20640, nu: 3052 },
      prev: { u: 8770, s: 13314, e: 63, c: 540 },
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
      { name: "Netherlands", value: 6204 }, { name: "Germany", value: 1887 },
      { name: "Belgium", value: 1402 }, { name: "United States", value: 912 },
      { name: "United Kingdom", value: 688 }, { name: "France", value: 340 }, { name: "Spain", value: 210 },
    ],
  };
}

// Trends: brand keywords en subreddits voor zelfstandigondernemers.nl (demo)
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

export const CITIES = [
  { name: "Amsterdam", value: [4.9041, 52.3676, 2140] },
  { name: "Rotterdam", value: [4.4777, 51.9244, 1120] },
  { name: "Den Haag", value: [4.3007, 52.0705, 760] },
  { name: "Utrecht", value: [5.1214, 52.0907, 690] },
  { name: "Eindhoven", value: [5.4697, 51.4416, 480] },
];

export const CLIENTS = [{ name: "Demo", id: "283274237" }];
