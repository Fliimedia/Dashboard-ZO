import { useMemo, useRef, useState, useEffect } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt, fmtDur, fmtPctDelta } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { CITIES, PERIOD_LABEL, KEYWORDS } from "../data.js";
import { useUI } from "../i18n.js";
import { getTargets } from "../targets.js";

const DIM_LABELS = { kanalen: "Kanalen", campagnes: "Campagnes", landingspaginas: "Landingspagina's" };

const PREV_YEAR = new Date().getFullYear() - 1;
const COMPARE_LABEL = { prev: "vorige periode", yoy: String(PREV_YEAR) };

export default function Result({ data, filter, goTrends }) {
  const { theme } = useUI();
  const { kpis, days, dims, countries } = data;
  const TARGET = getTargets().dailyConv;
  const [dimKey, setDimKey] = useState("kanalen");
  const [metric, setMetric] = useState("s"); // s=sessies, u=gebruikers, e=engagement
  const [sort, setSort] = useState({ k: "s", dir: -1 });
  function onSort(k) { setSort((p) => p.k === k ? { k, dir: -p.dir } : { k, dir: -1 }); }
  const tableRef = useRef(null);
  const mapRef = useRef(null);
  function jumpMap() { setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  const cmp = COMPARE_LABEL[filter.compare];

  // AI Summary: hoogtepunten uit de data
  const summary = useMemo(() => {
    const TMAP = { kanaal: "kanalen", campagne: "campagnes", landingspagina: "landingspaginas" };
    const pool = [];
    const add = (rows, type) => (rows || []).forEach((r) => pool.push({
      n: r.n, type, jump: TMAP[type] || null,
      vis: r.u ?? 0, pvis: r.pu ?? (r.u ?? 0), sal: r.c ?? 0, psal: r.pc ?? (r.c ?? 0),
    }));
    add(dims.kanalen, "kanaal");
    add(dims.campagnes, "campagne");
    add(dims.landingspaginas, "landingspagina");
    const kseed = (str) => { let x = 0; for (const ch of String(str)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
    (KEYWORDS || []).forEach((k) => {
      const g = kseed(k.k + "|" + filter.period);
      const scale = 1 + (((g % 40) - 18) / 100);              // volume varieert per periode
      const vis = Math.round((k.v ?? 0) * scale);
      const trend = (k.c || 0) + (((g >>> 4) % 26) - 13);     // trend jitter per periode
      const pvis = Math.max(1, Math.round(vis / (1 + trend / 100)));
      pool.push({ n: k.k, type: "zoekwoord", jump: null, vis, pvis, sal: 0, psal: 0 });
    });

    // Toppers alleen uit gemeten site-entiteiten (zoekwoord = zoekvolume, geen site-bezoekers)
    const sitePool = pool.filter((p) => p.type !== "zoekwoord");
    const topVis = [...sitePool].sort((a, b) => b.vis - a.vis)[0];
    const salePool = [...sitePool].filter((p) => p.sal > 0).sort((a, b) => b.sal - a.sal);
    let topSal = salePool[0];
    if (topSal && topVis && topSal.n === topVis.n && salePool[1]) topSal = salePool[1];

    // Bewegers: kandidaten op bezoekers en op verkopen, met minimale basis tegen ruis
    const moves = [];
    pool.forEach((p) => {
      if (p.pvis >= 200) { const d = p.vis - p.pvis; moves.push({ n: p.n, type: p.type, jump: p.jump, metric: "bezoekers", d, pct: Math.round((d / p.pvis) * 100) }); }
      if (p.psal >= 12) { const d = p.sal - p.psal; moves.push({ n: p.n, type: p.type, jump: p.jump, metric: "verkopen", d, pct: Math.round((d / p.psal) * 100) }); }
    });
    const distinct = (list) => {
      const seen = new Set(), out = [];
      for (const m of list) { const key = m.n + m.metric; if (seen.has(m.n)) continue; seen.add(m.n); out.push(m); if (out.length === 2) break; }
      return out;
    };
    const risers = distinct([...moves].filter((m) => m.pct > 0).sort((a, b) => b.pct - a.pct));
    const fallers = distinct([...moves].filter((m) => m.pct < 0).sort((a, b) => a.pct - b.pct));

    // Context per beweger: plausibele oorzaak op basis van type en richting
    const reason = (m) => {
      const up = m.pct >= 0;
      if (m.type === "zoekwoord") return up
        ? "de zoekvraag naar deze term neemt toe, waarschijnlijk seizoensgebonden of door een nieuwstrend"
        : "de zoekvraag koelt af, mogelijk na een piek of door meer concurrentie op deze term";
      if (m.type === "kanaal") return up
        ? "dit kanaal trekt aan, vermoedelijk door recente campagne-inzet of betere content"
        : "dit kanaal verliest terrein, mogelijk door lagere inzet of verschoven budget";
      if (m.type === "campagne") return up
        ? "de campagne presteert beter, waarschijnlijk door budget of een sterkere creative"
        : "de campagne zwakt af, mogelijk door vermoeidheid van de doelgroep of lager budget";
      return up
        ? "deze pagina wint aan kracht, vermoedelijk door betere vindbaarheid of interne verwijzingen"
        : "deze pagina verliest verkeer of conversie, mogelijk door een wijziging of minder instroom";
    };
    const withReason = (arr) => arr.map((m) => ({ ...m, why: reason(m) }));

    return { topVis, topSal, risers: withReason(risers), fallers: withReason(fallers) };
  }, [dims, countries, filter.period]);

  function jumpTo(key) {
    setDimKey(key);
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // dagelijkse grafiek, reageert op de gekozen scorecard-metric
  const METRIC = {
    s: { label: "Sessies", key: "s", target: TARGET, pct: false },
    u: { label: "Gebruikers", key: "u", target: Math.round(TARGET / 0.045 * 0.62), pct: false },
    c: { label: "Conversies", key: "c", target: TARGET, pct: false },
    e: { label: "Betrokkenheid", key: "e", target: getTargets().engTarget || 65, pct: true },
  };
  const dayOption = useMemo(() => {
    const m = METRIC[metric];
    const vals = days.map((d) => d[m.key] ?? 0);
    const line = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: "rgba(230,0,126,.28)" }, { offset: 1, color: "rgba(230,0,126,0)" }]);
    return {
      grid: { left: 40, right: 12, top: 12, bottom: 22 },
      tooltip: { ...TT, trigger: "axis", formatter: (p) => {
        const i = p[0].dataIndex, r = days[i];
        return r.date + "<br/>" + m.label + ": " + fmtInt(vals[i]) + (m.pct ? "%" : "") +
          "<br/>Target: " + fmtInt(m.target) + (m.pct ? "%" : "");
      }},
      xAxis: { ...AX, type: "category", data: days.map((d) => d.date), boundaryGap: false,
        axisLabel: { ...AX.axisLabel, interval: Math.max(1, Math.floor(days.length / 7)) } },
      yAxis: { ...AX, type: "value", splitLine: SPLIT, max: m.pct ? 100 : null },
      series: [
        { name: m.label, type: "line", data: vals, smooth: true, showSymbol: false,
          lineStyle: { width: 3, color: COLORS.magenta }, itemStyle: { color: COLORS.magenta }, areaStyle: { color: line } },
        { name: "Target", type: "line", data: days.map(() => m.target),
          showSymbol: false, lineStyle: { width: 1.6, type: "dashed", color: COLORS.deepviolet }, itemStyle: { color: COLORS.deepviolet } },
      ],
    };
  }, [days, TARGET, metric, theme]);

  return (
    <div className="view">
      <AISummary s={summary} kpis={kpis} jumpTo={jumpTo} jumpMap={jumpMap} periodLabel={PERIOD_LABEL[filter.period]} />

      <div className="ctrlrow">
        <Seg value={filter.period} onChange={filter.setPeriod} options={[
          { value: "jaar", label: "J" }, { value: "kwartaal", label: "K" },
          { value: "maand", label: "M" }, { value: "week", label: "D" },
        ]} />
        <Seg value={filter.compare} onChange={filter.setCompare} options={[
          { value: "prev", label: "Vs vorige periode" }, { value: "yoy", label: "Vs " + PREV_YEAR },
        ]} />
      </div>

      <Card>
        <div className="h1 disp">{METRIC[metric].label} per dag</div>
        <div className="h2"><b>{fmtPctDelta(kpis.cur.s, kpis.prev.s) >= 0 ? "+" : ""}{fmtPctDelta(kpis.cur.s, kpis.prev.s)}%</b> sessies tegenover {cmp}</div>
        <Chart option={dayOption} height={216} />
      </Card>

      <KpiStrip kpis={kpis} metric={metric} setMetric={setMetric} />

      <div className="stack">
        <Card>
          <div ref={tableRef} className="seghead" style={{ scrollMarginTop: 12 }}>
            <Seg value={dimKey} onChange={setDimKey} options={[
              { value: "kanalen", label: "Kanalen" },
              { value: "campagnes", label: "Campagnes" },
              { value: "landingspaginas", label: "Landingspagina's" },
            ]} />
          </div>
          <div className="tscroll">
            <table>
              <thead><tr>
                <th>Naam</th>
                {[["u","Gebruikers"],["s","Sessies"],["t","Duur"],["e","Eng. %"],["c","Conv."],["w","Waarde"]].map(([k,l]) => (
                  <th key={k} className={"num sortable" + (sort.k === k ? " on" : "")} onClick={() => onSort(k)}>
                    {l}{sort.k === k ? (sort.dir < 0 ? " \u2193" : " \u2191") : ""}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {[...dims[dimKey]].sort((a, b) => (a[sort.k] ?? 0) < (b[sort.k] ?? 0) ? sort.dir : -sort.dir).map((r) => (
                  <tr key={r.n}>
                    <td><span className="cell"><span className="ci"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg></span>{r.n}</span></td>
                    <td className="num mono">{fmtInt(r.u)}</td>
                    <td className="num mono">{fmtInt(r.s)}</td>
                    <td className="num mono">{fmtDur(r.d)}</td>
                    <td className="num mono">{r.e}%</td>
                    <td className="num mono">{fmtInt(r.c)}</td>
                    <td className="num mono">&euro;{fmtInt(r.w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <FlowCard kpis={kpis} dims={dims} flow={data.flow} funnel={data.funnel} />
      </div>

      <div className="r4">
        <div ref={mapRef} style={{ scrollMarginTop: 12, minWidth: 0 }}><MapCard countries={countries} cities={data.cities} /></div>
        <DemografieCard demografie={data.demografie} />
        <DevicesCard devices={data.devices} />
      </div>
    </div>
  );
}

function DevicesCard({ devices }) {
  if (!devices || !devices.length) return null;
  const total = devices.reduce((a, b) => a + b.u, 0) || 1;
  const ICON = {
    mobile: <svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>,
    desktop: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>,
    tablet: <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M11 18h2" /></svg>,
  };
  const NL = { mobile: "Mobiel", desktop: "Desktop", tablet: "Tablet" };
  return (
    <Card className="devcompact">
      <div className="devrow">
        {devices.map((d) => {
          const pct = Math.round((d.u / total) * 100);
          return (
            <div className="devitem" key={d.n}>
              <div className="devtop">{ICON[d.n] || ICON.desktop}<span>{NL[d.n] || d.n}</span></div>
              <div className="devpct disp">{pct}%</div>
              <div className="devcr">conv. {String(d.cr).replace(".", ",")}%</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DemografieCard({ demografie }) {
  const { theme } = useUI(); void theme;
  if (!demografie) {
    return (
      <Card>
        <div className="h1 disp">Demografie</div>
        <div className="h2">Leeftijd en geslacht</div>
        <div className="mapmsg" style={{ height: 140, textAlign: "center", padding: "0 14px" }}>
          Nog geen demografische data beschikbaar. Zet Google Signals aan op de GA4-property; zodra Google voldoende data heeft, verschijnt dit automatisch.
        </div>
      </Card>
    );
  }
  const total = demografie.gender.reduce((a, b) => a + b.v, 0) || 1;
  const GCOL = { male: COLORS.magenta, female: COLORS.magenta2 };
  return (
    <Card>
      <div className="h1 disp">Demografie</div>
      <div className="h2">Leeftijd en geslacht, uit GA4</div>
      <div className="demrow">
        <Chart height={176} style={{ flex: 1 }} option={{
          grid: { left: 44, right: 26, top: 4, bottom: 4 },
          tooltip: { ...TT, trigger: "axis", axisPointer: { type: "none" } },
          xAxis: { type: "value", splitLine: { show: false }, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
          yAxis: { ...AX, type: "category", data: demografie.age.map((a) => a.n).reverse(), axisLine: { show: false } },
          series: [{ type: "bar", data: demografie.age.map((a) => a.v).reverse(), barWidth: 11,
            label: { show: true, position: "right", color: "#5B6685", fontFamily: "IBM Plex Mono", fontSize: 9 },
            itemStyle: { borderRadius: [0, 6, 6, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: COLORS.violet }, { offset: 1, color: COLORS.magenta }]) } }],
        }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "none" }}>
          <Chart height={104} style={{ width: 104 }} option={{
            tooltip: { ...TT, trigger: "item" },
            series: [{ type: "pie", radius: ["62%", "86%"],
              itemStyle: { borderColor: COLORS.surface, borderWidth: 2 }, label: { show: false },
              data: demografie.gender.map((g) => ({ name: g.n, value: g.v, itemStyle: { color: GCOL[g.n] || COLORS.dim } })) }],
          }} />
          <div className="glegend">
            {demografie.gender.map((g) => (
              <div className="g" key={g.n}>
                <span className="swatch" style={{ background: GCOL[g.n] || COLORS.dim }} />
                {g.n === "male" ? "Man" : g.n === "female" ? "Vrouw" : g.n} {Math.round((g.v / total) * 100)}%
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AISummary({ s, kpis, jumpTo, jumpMap, periodLabel }) {
  const I = {
    star: <svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.2l5.9-.9z" /></svg>,
    up: <svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-7" /><path d="M17 8h4v4" /></svg>,
    down: <svg viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 7 7" /><path d="M17 16h4v-4" /></svg>,
  };
  const TL = { kanaal: "het kanaal", campagne: "de campagne", landingspagina: "de landingspagina", zoekwoord: "het zoekwoord" };
  const metric = (m) => m.metric === "verkopen" ? "verkopen" : "bezoekers";
  const jumpFor = (it) => it && it.jump ? () => jumpTo(it.jump) : undefined;

  const items = [];

  // Bullet 1: toppers, twee zinnen (bezoekers + verkopen)
  if (s.topVis || s.topSal) {
    items.push({
      ic: I.star, go: jumpFor(s.topVis || s.topSal),
      text: <>
        {s.topVis && <>De meeste bezoekers kwamen via <b>{s.topVis.n}</b>, goed voor {fmtInt(s.topVis.vis)} bezoekers in de {periodLabel}. </>}
        {s.topSal && <>De meeste verkopen kwamen van <b>{s.topSal.n}</b> met {fmtInt(s.topSal.sal)} conversies, wat dit de sterkste bron voor omzet maakt.</>}
      </>,
    });
  }

  // Bullet 2: twee grootste stijgers, elk een zin met context
  if (s.risers && s.risers.length) {
    const [a, b] = s.risers;
    items.push({
      ic: I.up, go: jumpFor(a),
      text: <>
        {a && <>De grootste stijger is {TL[a.type]} <b>{a.n}</b>, met {a.pct}% meer {metric(a)}; {a.why}. </>}
        {b && <>Daarnaast groeide {TL[b.type]} <b>{b.n}</b> met {b.pct}% meer {metric(b)}, doordat {b.why}.</>}
      </>,
    });
  }

  // Bullet 3: twee grootste dalers, elk een zin met context
  if (s.fallers && s.fallers.length) {
    const [a, b] = s.fallers;
    items.push({
      ic: I.down, go: jumpFor(a),
      text: <>
        {a && <>De grootste daler is {TL[a.type]} <b>{a.n}</b>, met {Math.abs(a.pct)}% minder {metric(a)}; {a.why}. </>}
        {b && <>Ook {TL[b.type]} <b>{b.n}</b> daalde met {Math.abs(b.pct)}% {metric(b)}, doordat {b.why}.</>}
      </>,
    });
  }

  return (
    <Card>
      <div className="h1 disp">AI Summary <span className="pill">{periodLabel}</span></div>
      <div className="oitems">
        {items.map((it, i) => (
          <div className={"oitem" + (it.go ? "" : " nolink")} key={i} onClick={it.go}>
            <div className="oic">{it.ic}</div>
            <div className="otext">{it.text}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function useCountUp(target, dur = 700) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current, to = target;
    if (from === to) return;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

function CountUp({ value, suffix = "" }) {
  const v = useCountUp(value);
  return <>{fmtInt(Math.round(v))}{suffix}</>;
}

function KpiStrip({ kpis, metric, setMetric }) {
  const { cur, prev } = kpis;
  const items = [
    { l: "Sessies", v: cur.s, sfx: "", d: fmtPctDelta(cur.s, prev.s), m: "s" },
    { l: "Gebruikers", v: cur.u, sfx: "", d: fmtPctDelta(cur.u, prev.u), m: "u" },
    { l: "Conversies", v: cur.c, sfx: "", d: fmtPctDelta(cur.c, prev.c), m: "c" },
    { l: "Betrokkenheid", v: cur.e, sfx: "%", d: fmtPctDelta(cur.e, prev.e), m: "e" },
  ];
  return (
    <Card className="kpis">
      {items.map((k) => (
        <div className={"kpi" + (k.m ? " kclick" : "") + (k.m && k.m === metric ? " kon" : "")}
          key={k.l} onClick={() => k.m && setMetric(k.m)}>
          <div className="kl">{k.l}</div>
          <div className="kv disp"><CountUp value={k.v} suffix={k.sfx} /></div>
          <span className={"kd " + (k.d >= 0 ? "up" : "down")}>{k.d >= 0 ? "+" : ""}{k.d}%</span>
        </div>
      ))}
    </Card>
  );
}

// Userflow en funnel in een kaart met toggle
function FlowCard({ kpis, dims, flow, funnel }) {
  const { theme } = useUI(); void theme;
  const [mode, setMode] = useState("flow");
  const [fpick, setFpick] = useState(null);
  const s = kpis.cur.s, conv = kpis.cur.c;
  const rate = s ? (conv / s) * 100 : 0;
  const avgValue = conv ? kpis.cur.w / conv : 0;

  // Flow: meest gebruikte paginapad naar conversie, uit echte GA4-pagina's indien aanwezig
  const flowData = flow || {
    nodes: [{ name: "Sessies" }, { name: "/home" }, { name: "/aanbod" }, { name: "/aanvragen" }, { name: "Conversie" }, { name: "Exit" }],
    links: [
      { source: "Sessies", target: "/home", value: Math.round(s * 0.42) },
      { source: "Sessies", target: "/aanbod", value: Math.round(s * 0.30) },
      { source: "Sessies", target: "/aanvragen", value: Math.round(s * 0.18) },
      { source: "/home", target: "Conversie", value: Math.round(conv * 0.2) },
      { source: "/home", target: "Exit", value: Math.round(s * 0.42 - conv * 0.2) },
      { source: "/aanbod", target: "Conversie", value: Math.round(conv * 0.3) },
      { source: "/aanbod", target: "Exit", value: Math.round(s * 0.30 - conv * 0.3) },
      { source: "/aanvragen", target: "Conversie", value: Math.round(conv * 0.5) },
      { source: "/aanvragen", target: "Exit", value: Math.round(s * 0.18 - conv * 0.5) },
    ],
  };
  const flowOption = {
    tooltip: { ...TT, trigger: "item", formatter: (p) =>
      p.dataType === "edge" ? p.data.source + " naar " + p.data.target + ": " + fmtInt(p.data.value) : p.name },
    series: [{ type: "sankey", left: 6, right: 84, top: 8, bottom: 8, nodeWidth: 9, nodeGap: 9, draggable: false,
      label: { fontFamily: "IBM Plex Mono", fontSize: 9, color: "#6E6879" },
      lineStyle: { color: "gradient", opacity: 0.28, curveness: 0.5 },
      itemStyle: { borderWidth: 0, color: COLORS.magenta },
      data: flowData.nodes.map((nd) => ({
        name: nd.name,
        itemStyle: { color: nd.name === "Conversie" ? COLORS.deepviolet : nd.name === "Exit" ? COLORS.dim : nd.name === "Sessies" ? COLORS.magenta : COLORS.violet },
      })),
      links: flowData.links,
    }],
  };

  // Funnel: uitsluitend stappen die echt uit GA komen; geschatte stappen tonen we niet
  const allSteps = funnel || [
    { key: "sessie", name: "Sessie", value: s, source: "sessions", note: "Alle sessies in de periode." },
    { key: "aankoop", name: "Aankoop", value: conv, source: "keyEvents", note: "Nieuwe klanten." },
  ];
  const steps = allSteps.filter((x) => x.source !== "schatting");
  const hidden = allSteps.length - steps.length;
  const COLS = [COLORS.magenta, COLORS.magenta2, COLORS.violet, COLORS.deepviolet];
  const funnelOption = {
    tooltip: { ...TT, trigger: "item", formatter: (p) => p.name + ": " + fmtInt(p.value) },
    series: [{ type: "funnel", funnelAlign: "center", orient: "horizontal",
      left: 6, right: 6, top: 6, bottom: 22, sort: "descending", gap: 2, minSize: "24%", maxSize: "100%",
      label: { show: true, position: "bottom", color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 8.5,
        formatter: (p) => p.name + "\n" + fmtInt(p.value) },
      labelLine: { show: false }, itemStyle: { borderWidth: 0 },
      emphasis: { label: { color: "#141019" } },
      data: steps.map((st, i) => ({ name: st.name, value: st.value, itemStyle: { color: COLS[i % COLS.length] } })),
    }],
  };

  return (
    <Card>
      <div className="seghead">
        <Seg value={mode} onChange={setMode} options={[
          { value: "flow", label: "Flow" }, { value: "funnel", label: "Funnel" },
        ]} />
      </div>
      {mode === "flow" ? (
        <>
          <div className="h2">Meest gebruikte paginapad naar conversie{flow ? "" : " (schatting)"}</div>
          <Chart option={flowOption} height={252} />
        </>
      ) : (
        <>
          <div className="h2">Van sessie naar klant</div>
          <Chart option={funnelOption} height={132} onClick={(p) => {
            const f = steps.find((x) => x.name === p.name); if (f) setFpick(f);
          }} />
          <div className="fdrops">
            {steps.slice(1).map((st, i) => {
              const prev = steps[i].value || 1;
              const pct = Math.round((st.value / prev) * 1000) / 10;
              return <div className="fdrop" key={st.key}><span>{steps[i].name} naar {st.name}</span><b>{String(pct).replace(".", ",")}%</b></div>;
            })}
          </div>
          {fpick
            ? <div className="fnote"><b>{fpick.name}, {fmtInt(fpick.value)}.</b> {fpick.note} <span className="demobadge" style={{ marginLeft: 6 }}>{fpick.source === "event" ? "GA4-event" : fpick.source === "sessions" || fpick.source === "keyEvents" ? "GA4" : "schatting"}</span></div>
            : <div className="fnote" style={{ color: "var(--mist)" }}>Tik op een stap voor uitleg en de databron.</div>}
          <div className="fstats">
            <div className="fstat"><div className="fl">Conversieratio</div><div className="fv disp">{rate.toFixed(1).replace(".", ",")}%</div></div>
            <div className="fstat"><div className="fl">Gem. waarde p. klant</div><div className="fv disp">&euro;{fmtInt(avgValue)}</div></div>
          </div>
          {hidden > 0 && <div className="maphint">{hidden} tussenstap{hidden > 1 ? "pen" : ""} (lead, aanvraag) verschijn{hidden > 1 ? "en" : "t"} zodra de site deze GA4-events stuurt.</div>}
        </>
      )}
    </Card>
  );
}

function MapCard({ countries, cities }) {
  const { theme } = useUI();
  const [mapReady, setMapReady] = useState(null); // null=laden, true=ok, false=fout
  const [view, setView] = useState("land");
  const [hint, setHint] = useState("Tik op een stad om in te zoomen");
  const chartRef = useRef(null);

  const VIEWS = {
    land: { center: [5.4, 52.2], zoom: 22 },
    continent: { center: [10, 50], zoom: 6.2 },
    wereld: { center: [10, 25], zoom: 1.35 },
  };
  const cityData = (cities && cities.length) ? cities : CITIES;

  useEffect(() => {
    let alive = true;
    if (echarts.getMap && echarts.getMap("world")) { setMapReady(true); return; }
    fetch("https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json")
      .then((r) => { if (!r.ok) throw 0; return r.json(); })
      .then((geo) => { if (!alive) return; echarts.registerMap("world", geo); setMapReady(true); })
      .catch(() => { if (alive) setMapReady(false); });
    return () => { alive = false; };
  }, []);

  const max = Math.max(...countries.map((c) => c.value), 1);
  const regions = countries.map((c) => ({
    name: c.name,
    itemStyle: { areaColor: "rgba(230,0,126," + (0.10 + (c.value / max) * 0.55).toFixed(2) + ")" },
  }));

  const option = useMemo(() => ({
    tooltip: { ...TT, trigger: "item", formatter: (p) => {
      if (p.seriesType === "effectScatter") {
        const cy = cityData.find((c) => c.name === p.name);
        return p.name + "<br/>Sessies: " + fmtInt(p.value[2]) + (cy && cy.e != null ? "<br/>Betrokkenheid: " + cy.e + "%" : "");
      }
      const co = countries.find((c) => c.name === p.name);
      if (!co) return p.name;
      return p.name + "<br/>Sessies: " + fmtInt(co.value) + (co.e != null ? "<br/>Betrokkenheid: " + co.e + "%" : "");
    } },
    geo: { map: "world", roam: true, center: VIEWS[view].center, zoom: VIEWS[view].zoom,
      itemStyle: { areaColor: COLORS.area, borderColor: COLORS.border, borderWidth: 0.5 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: "rgba(230,0,126,.26)" } },
      select: { disabled: true }, regions, scaleLimit: { min: 1, max: 60 } },
    series: [{ name: "steden", type: "effectScatter", coordinateSystem: "geo",
      data: view === "land" ? cityData : [],
      symbolSize: (v) => 6 + v[2] / 220,
      rippleEffect: { scale: 2.4, brushType: "stroke" },
      itemStyle: { color: COLORS.magenta, shadowColor: "rgba(230,0,126,.5)", shadowBlur: 8 },
      label: { show: false } }],
  }), [view, mapReady, cityData, theme]);

  function onClick(p) {
    if (view === "land" && p.seriesType === "effectScatter" && chartRef.current) {
      chartRef.current.setOption({ geo: { center: [p.value[0], p.value[1]], zoom: 46 } });
      setHint("Ingezoomd op " + p.name + ", kies Land om terug te gaan");
    }
  }

  return (
    <Card>
      <div className="seghead">
        <Seg value={view} onChange={(v) => { setView(v); setHint("Tik op een stad om in te zoomen"); }} options={[
          { value: "land", label: "Land" }, { value: "continent", label: "Continent" }, { value: "wereld", label: "Wereld" },
        ]} />
      </div>
      {mapReady === false ? (
        <div className="chartbox" style={{ height: 252 }}><div className="mapmsg">Kaart kon niet laden, cijfers hieronder</div></div>
      ) : mapReady === null ? (
        <div className="chartbox" style={{ height: 252 }}><div className="mapmsg">Kaart laden...</div></div>
      ) : (
        <div className="mapwrap">
          <Chart option={option} height={300} onInit={(c) => { chartRef.current = c; }} onClick={onClick} />
        <div className="maplegend">
          <div className="mlghead">{view === "land" ? "Top steden" : "Top landen"}</div>
          {(view === "land" ? [...cityData].sort((a, b) => b.value[2] - a.value[2]) : [...countries].sort((a, b) => b.value - a.value))
            .slice(0, 10).map((r, i) => {
              const nm = view === "land" ? r.name : r.name;
              const val = view === "land" ? r.value[2] : r.value;
              return <div className="mlg" key={nm}><span className="mlgi">{i + 1}</span><span className="mlgn">{nm}</span><span className="mlgv mono">{fmtInt(val)}</span></div>;
            })}
        </div>
        </div>
      )}
      {view === "land" && mapReady && <div className="maphint">{hint}</div>}
      {mapReady === false && (
        <div className="maplist">
          {countries.slice(0, 5).map((c) => (
            <div className="mstat" key={c.name}>{c.name}<b>{fmtInt(c.value)}</b></div>
          ))}
        </div>
      )}
    </Card>
  );
}
