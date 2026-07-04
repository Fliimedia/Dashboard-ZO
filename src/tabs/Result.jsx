import { useMemo, useRef, useState, useEffect } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt, fmtDur, fmtPctDelta } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { CITIES, PERIOD_LABEL } from "../data.js";
import { getTargets } from "../targets.js";

const DIM_LABELS = { kanalen: "Kanalen", campagnes: "Campagnes", landingspaginas: "Landingspagina's" };

const COMPARE_LABEL = { prev: "vorige periode", yoy: "vorig jaar" };

export default function Result({ data, filter, goTrends }) {
  const { kpis, days, dims, countries } = data;
  const TARGET = getTargets().dailyConv;
  const [dimKey, setDimKey] = useState("kanalen");
  const [metric, setMetric] = useState("s"); // s=sessies, u=gebruikers, e=engagement
  const tableRef = useRef(null);
  const mapRef = useRef(null);
  function jumpMap() { setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  const cmp = COMPARE_LABEL[filter.compare];

  // AI Summary: hoogtepunten uit de data
  const summary = useMemo(() => {
    const topCh = [...dims.kanalen].sort((a, b) => b.s - a.s)[0];
    const topCa = [...dims.campagnes].sort((a, b) => b.s - a.s)[0];
    const topLp = [...dims.landingspaginas].sort((a, b) => b.s - a.s)[0];
    const topLand = countries && countries[0];
    return { topCh, topCa, topLp, topLand };
  }, [dims, countries]);

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
      { offset: 0, color: "rgba(28,46,112,.28)" }, { offset: 1, color: "rgba(28,46,112,0)" }]);
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
  }, [days, TARGET, metric]);

  return (
    <div className="view">
      <div className="ctrlrow">
        <Seg value={filter.period} onChange={filter.setPeriod} options={[
          { value: "jaar", label: "J" }, { value: "kwartaal", label: "K" },
          { value: "maand", label: "M" }, { value: "week", label: "D" },
        ]} />
        <Seg value={filter.compare} onChange={filter.setCompare} options={[
          { value: "prev", label: "Vs vorige periode" }, { value: "yoy", label: "Vs vorig jaar" },
        ]} />
      </div>

      <Card>
        <div className="h1 disp">{METRIC[metric].label} per dag</div>
        <div className="h2"><b>{fmtPctDelta(kpis.cur.s, kpis.prev.s) >= 0 ? "+" : ""}{fmtPctDelta(kpis.cur.s, kpis.prev.s)}%</b> sessies tegenover {cmp}</div>
        <Chart option={dayOption} height={216} />
      </Card>

      <KpiStrip kpis={kpis} metric={metric} setMetric={setMetric} />

      <div className="r3">
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
              <thead><tr><th>Naam</th><th className="num">Gebruikers</th><th className="num">Sessies</th><th className="num">Duur</th><th className="num">Eng. %</th><th className="num">Conv.</th><th className="num">Waarde</th></tr></thead>
              <tbody>
                {dims[dimKey].map((r) => (
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
      </div>
    </div>
  );
}

function DemografieCard({ demografie }) {
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
              itemStyle: { borderColor: "#fff", borderWidth: 2 }, label: { show: false },
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
  const Up = <svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
  return (
    <Card>
      <div className="h1 disp">AI Summary <span className="demobadge" style={{ marginLeft: 8, verticalAlign: "middle" }}>{periodLabel}</span></div>
      <div className="ins">
        <div className="oitem" onClick={() => jumpTo("kanalen")}>
          <div className="oic">{Up}</div>
          <div>
            <div className="ot">Belangrijkste kanaal: {s.topCh?.n}, {fmtInt(s.topCh?.u || 0)} bezoekers en {fmtInt(s.topCh?.c || 0)} conversies</div>
            <div className="od">kanaal / bekijk tabel</div>
          </div>
        </div>
        <div className="oitem" onClick={() => jumpTo("campagnes")}>
          <div className="oic">{Up}</div>
          <div>
            <div className="ot">Belangrijkste campagne: {s.topCa?.n || "geen"}, {fmtInt(s.topCa?.s || 0)} sessies</div>
            <div className="od">campagne / bekijk tabel</div>
          </div>
        </div>
        <div className="oitem" onClick={() => jumpTo("landingspaginas")}>
          <div className="oic">{Up}</div>
          <div>
            <div className="ot">Meest bezochte landingspagina: {s.topLp?.n}, {fmtInt(s.topLp?.s || 0)} sessies</div>
            <div className="od">landingspagina / bekijk tabel</div>
          </div>
        </div>
        <div className="oitem" onClick={jumpMap}>
          <div className="oic">{Up}</div>
          <div>
            <div className="ot">Sterkste markt: {s.topLand?.name || "onbekend"}, {fmtInt(s.topLand?.value || 0)} sessies{s.topLand?.e != null ? ", " + s.topLand.e + "% betrokken" : ""}</div>
            <div className="od">locatie / bekijk kaart</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KpiStrip({ kpis, metric, setMetric }) {
  const { cur, prev } = kpis;
  const items = [
    { l: "Sessies", v: fmtInt(cur.s), d: fmtPctDelta(cur.s, prev.s), m: "s" },
    { l: "Gebruikers", v: fmtInt(cur.u), d: fmtPctDelta(cur.u, prev.u), m: "u" },
    { l: "Conversies", v: fmtInt(cur.c), d: fmtPctDelta(cur.c, prev.c), m: "c" },
    { l: "Betrokkenheid", v: cur.e + "%", d: fmtPctDelta(cur.e, prev.e), m: "e" },
  ];
  return (
    <Card className="kpis">
      {items.map((k) => (
        <div className={"kpi" + (k.m ? " kclick" : "") + (k.m && k.m === metric ? " kon" : "")}
          key={k.l} onClick={() => k.m && setMetric(k.m)}>
          <div className="kl">{k.l}</div>
          <div className="kv disp">{k.v}</div>
          <span className={"kd " + (k.d >= 0 ? "up" : "down")}>{k.d >= 0 ? "+" : ""}{k.d}%</span>
        </div>
      ))}
    </Card>
  );
}

const FUNNEL5 = [
  { k: "Sessie", v: 14912, note: "Alle sessies in de periode, de bovenkant van de funnel." },
  { k: "Interactie", v: 8200, note: "Sessies met betrokkenheid: scrollen, klikken of meerdere pagina's." },
  { k: "Start aanvraag", v: 3100, note: "Bezoekers die de aanvraagpagina openen of het formulier starten." },
  { k: "Aanvraag", v: 1450, note: "Ingevulde aanvragen, een serieuze intentie." },
  { k: "Conversie", v: 622, note: "Afgeronde aanvragen, oftewel nieuwe klanten." },
];

function BowtieFunnel({ avgValue }) {
  const [pick, setPick] = useState(null);
  const stages = FUNNEL5, N = stages.length;
  const W = 1000, cy = 112, segW = W / N, gap = 9;
  const vmax = stages[0].v;
  const hAt = (v) => 12 + 92 * (v / vmax);
  const hs = stages.map((s) => hAt(s.v));
  const endH = 9;
  const conv = ((stages[N - 1].v / stages[0].v) * 100).toFixed(1).replace(".", ",");
  const toReq = ((stages[3].v / stages[0].v) * 100).toFixed(1).replace(".", ",");
  return (
    <>
      <div className="h2">Van sessie naar klant, voorbeelddata</div>
      <svg className="bowtie" viewBox="0 0 1000 280" role="img" aria-label="Funnel van sessie naar conversie">
        <defs>
          <linearGradient id="bowFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#DA3E68" /><stop offset="1" stopColor="#8E1B3D" />
          </linearGradient>
        </defs>
        {stages.map((st, i) => {
          const xL = i * segW + gap / 2, xR = (i + 1) * segW - gap / 2, cx = (xL + xR) / 2;
          const hL = hs[i], hR = i < N - 1 ? hs[i + 1] : endH;
          const pts = `${xL},${cy - hL} ${xR},${cy - hR} ${xR},${cy + hR} ${xL},${cy + hL}`;
          return (
            <g key={i} className={"bseg" + (pick === i ? " on" : "")} onClick={() => setPick(i)} role="button" tabIndex={0}
               onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPick(i); } }}>
              <polygon points={pts} />
              <text className="blbl" x={cx} y={244} textAnchor="middle">{st.k}</text>
              <text className="bval" x={cx} y={263} textAnchor="middle">{fmtInt(st.v)}</text>
            </g>
          );
        })}
      </svg>
      {pick != null
        ? <div className="fnote"><b>{stages[pick].k}, {fmtInt(stages[pick].v)}.</b> {stages[pick].note} <span className="demobadge" style={{ marginLeft: 6 }}>voorbeeld</span></div>
        : <div className="fnote" style={{ color: "var(--mist)" }}>Tik op een stap voor uitleg.</div>}
      <div className="fstats">
        <div className="fstat"><div className="fl">Conversieratio</div><div className="fv disp">{conv}%</div></div>
        <div className="fstat"><div className="fl">Sessie naar aanvraag</div><div className="fv disp">{toReq}%</div></div>
        <div className="fstat"><div className="fl">Gem. waarde p. klant</div><div className="fv disp">&euro;{fmtInt(avgValue || 332)}</div></div>
      </div>
    </>
  );
}

// Userflow en funnel in een kaart met toggle
function FlowCard({ kpis, dims, flow, funnel }) {
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
          <Chart option={flowOption} height={216} />
        </>
      ) : (
        <BowtieFunnel avgValue={avgValue} />
      )}
    </Card>
  );
}

function MapCard({ countries, cities }) {
  const [mapReady, setMapReady] = useState(null); // null=laden, true=ok, false=fout
  const [view, setView] = useState("land");
  const [hint, setHint] = useState("Tik op een stad om in te zoomen");
  const chartRef = useRef(null);

  const VIEWS = {
    land: { center: [5.4, 52.15], zoom: 16 },
    continent: { center: [10, 51], zoom: 4.4 },
    wereld: { center: [8, 20], zoom: 1.15 },
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
    itemStyle: { areaColor: "rgba(28,46,112," + (0.10 + (c.value / max) * 0.55).toFixed(2) + ")" },
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
      itemStyle: { areaColor: "rgba(20,16,25,.05)", borderColor: "rgba(20,16,25,.16)", borderWidth: 0.5 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: "rgba(28,46,112,.26)" } },
      select: { disabled: true }, regions, scaleLimit: { min: 1, max: 60 } },
    series: [{ name: "steden", type: "effectScatter", coordinateSystem: "geo",
      data: view === "land" ? cityData : [],
      symbolSize: (v) => 6 + v[2] / 220,
      rippleEffect: { scale: 2.4, brushType: "stroke" },
      itemStyle: { color: COLORS.magenta, shadowColor: "rgba(28,46,112,.5)", shadowBlur: 8 },
      label: { show: false } }],
  }), [view, mapReady, cityData]);

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
        <Chart option={option} height={252} onInit={(c) => { chartRef.current = c; }} onClick={onClick} />
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
