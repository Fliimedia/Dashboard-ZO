import { useMemo, useRef, useState, useEffect } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt, fmtDur, fmtPctDelta } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { KEYWORDS, SPLIT_PRODUCT, SPLIT_BEROEP, CITIES } from "../data.js";
import { getTargets } from "../targets.js";

const DIM_LABELS = { kanalen: "Kanalen", campagnes: "Campagnes", landingspaginas: "Landingspagina's" };

const COMPARE_LABEL = { prev: "vorige periode", yoy: "vorig jaar" };

export default function Result({ data, filter, goTrends }) {
  const { kpis, days, dims, countries } = data;
  const TARGET = getTargets().dailyConv;
  const [dimKey, setDimKey] = useState("kanalen");
  const tableRef = useRef(null);
  const cmp = COMPARE_LABEL[filter.compare];

  // AI Summary: hoogtepunten uit de data
  const summary = useMemo(() => {
    const topCh = [...dims.kanalen].sort((a, b) => b.s - a.s)[0];
    const topCa = [...dims.campagnes].sort((a, b) => b.s - a.s)[0];
    const topLp = [...dims.landingspaginas].sort((a, b) => b.s - a.s)[0];
    const topKw = [...KEYWORDS].sort((a, b) => b.c - a.c)[0];
    return { topCh, topCa, topLp, topKw };
  }, [dims]);

  function jumpTo(key) {
    setDimKey(key);
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // dagelijkse grafiek
  const dayOption = useMemo(() => ({
    grid: { left: 34, right: 34, top: 12, bottom: 22 },
    tooltip: { ...TT, trigger: "axis", formatter: (p) => {
      const i = p[0].dataIndex, r = days[i];
      return r.date + "<br/>Sessies: " + fmtInt(r.s) + "<br/>Aanmeldingen: " + fmtInt(r.c) + " (target " + TARGET + ")<br/>Betrokkenheid: " + r.e + "%";
    }},
    xAxis: { ...AX, type: "category", data: days.map((d) => d.date), boundaryGap: false,
      axisLabel: { ...AX.axisLabel, interval: Math.max(1, Math.floor(days.length / 7)) } },
    yAxis: [
      { ...AX, type: "value", splitLine: SPLIT },
      { ...AX, type: "value", splitLine: { show: false }, max: Math.max(60, TARGET * 2) },
    ],
    series: [
      { name: "Sessies", type: "line", data: days.map((d) => d.s), smooth: true, showSymbol: false,
        lineStyle: { width: 3, color: COLORS.magenta }, itemStyle: { color: COLORS.magenta },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(230,0,126,.30)" }, { offset: 1, color: "rgba(230,0,126,0)" }]) } },
      { name: "Aanmeldingen", type: "bar", yAxisIndex: 1, data: days.map((d) => d.c), barWidth: 5,
        itemStyle: { color: "rgba(122,63,242,.55)", borderRadius: [3, 3, 0, 0] } },
      { name: "Target", type: "line", yAxisIndex: 1, data: days.map(() => TARGET),
        showSymbol: false, lineStyle: { width: 1.6, type: "dashed", color: COLORS.deepviolet }, itemStyle: { color: COLORS.deepviolet } },
    ],
  }), [days, TARGET]);

  return (
    <div className="view">
      <div className="hrow">
        <Seg value={filter.period} onChange={filter.setPeriod} options={[
          { value: "jaar", label: "Jaar" }, { value: "kwartaal", label: "Kwartaal" },
          { value: "maand", label: "Maand" }, { value: "week", label: "Week" },
        ]} />
        <Seg value={filter.compare} onChange={filter.setCompare} options={[
          { value: "prev", label: "Vs vorige periode" }, { value: "yoy", label: "Vs vorig jaar" },
        ]} />
      </div>
      <AISummary s={summary} kpis={kpis} jumpTo={jumpTo} goTrends={goTrends} />

      <Card>
        <div className="h1 disp">Sessies en conversies per dag</div>
        <div className="h2"><b>{fmtPctDelta(kpis.cur.s, kpis.prev.s) >= 0 ? "+" : ""}{fmtPctDelta(kpis.cur.s, kpis.prev.s)}%</b> sessies tegenover {cmp}</div>
        <Chart option={dayOption} height={216} />
      </Card>

      <KpiStrip kpis={kpis} />

      <div className="r3">
        <Card>
          <div ref={tableRef} className="hrow" style={{ scrollMarginTop: 12 }}>
            <div>
              <div className="h1 disp">{DIM_LABELS[dimKey]}</div>
              <div className="h2">6 metrics per {dimKey === "kanalen" ? "kanaal" : dimKey === "campagnes" ? "campagne" : "landingspagina"}</div>
            </div>
            <Seg value={dimKey} onChange={setDimKey} options={[
              { value: "kanalen", label: "Kanalen" },
              { value: "campagnes", label: "Campagnes" },
              { value: "landingspaginas", label: "Landingspag." },
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
        <FlowCard kpis={kpis} dims={dims} />
      </div>

      <div className="r4">
        <MapCard countries={countries} />
        <Card>
          <div className="h1 disp">Demografie</div>
          <div className="h2">Leeftijd en geslacht</div>
          <div className="demrow">
            <Chart height={176} style={{ flex: 1 }} option={{
              grid: { left: 44, right: 26, top: 4, bottom: 4 },
              tooltip: { ...TT, trigger: "axis", axisPointer: { type: "none" }, formatter: "{b}: {c}%" },
              xAxis: { type: "value", splitLine: { show: false }, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
              yAxis: { ...AX, type: "category", data: ["65+", "55-64", "45-54", "35-44", "25-34", "18-24"], axisLine: { show: false } },
              series: [{ type: "bar", data: [6, 10, 15, 24, 31, 14], barWidth: 11,
                label: { show: true, position: "right", color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 9, formatter: "{c}%" },
                itemStyle: { borderRadius: [0, 6, 6, 0],
                  color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: COLORS.violet }, { offset: 1, color: COLORS.magenta }]) } }],
            }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "none" }}>
              <Chart height={104} style={{ width: 104 }} option={{
                tooltip: { ...TT, trigger: "item", formatter: "{b}: {c}%" },
                series: [{ type: "pie", radius: ["62%", "86%"],
                  itemStyle: { borderColor: "#fff", borderWidth: 2 }, label: { show: false },
                  data: [
                    { name: "Vrouw", value: 54, itemStyle: { color: COLORS.magenta } },
                    { name: "Man", value: 43, itemStyle: { color: COLORS.violet } },
                    { name: "Onbekend", value: 3, itemStyle: { color: COLORS.dim } },
                  ] }],
              }} />
              <div className="glegend">
                <div className="g"><span className="swatch" style={{ background: COLORS.magenta }} />Vrouw 54%</div>
                <div className="g"><span className="swatch" style={{ background: COLORS.violet }} />Man 43%</div>
                <div className="g"><span className="swatch" style={{ background: COLORS.dim }} />Onbekend 3%</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AISummary({ s, kpis, jumpTo, goTrends }) {
  const Up = <svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
  return (
    <Card className="hlcard">
      <div className="h1 disp">AI Summary</div>
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
        <div className="oitem" onClick={goTrends}>
          <div className="oic">{Up}</div>
          <div>
            <div className="ot">Meest toegenomen trend: "{s.topKw?.k}", +{s.topKw?.c}% zoekvolume</div>
            <div className="od">trend / open Trends</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KpiStrip({ kpis }) {
  const { cur, prev } = kpis;
  const items = [
    { l: "Sessies", v: fmtInt(cur.s), d: fmtPctDelta(cur.s, prev.s) },
    { l: "Gebruikers", v: fmtInt(cur.u), d: fmtPctDelta(cur.u, prev.u) },
    { l: "Conversies", v: fmtInt(cur.c), d: fmtPctDelta(cur.c, prev.c) },
    { l: "Betrokkenheid", v: cur.e + "%", d: fmtPctDelta(cur.e, prev.e) },
  ];
  return (
    <Card className="kpis">
      {items.map((k) => (
        <div className="kpi" key={k.l}>
          <div className="kl">{k.l}</div>
          <div className="kv disp">{k.v}</div>
          <span className={"kd " + (k.d >= 0 ? "up" : "down")}>{k.d >= 0 ? "+" : ""}{k.d}%</span>
        </div>
      ))}
    </Card>
  );
}

// Userflow en funnel in een kaart met toggle
function FlowCard({ kpis, dims }) {
  const [mode, setMode] = useState("flow");
  const s = kpis.cur.s, conv = kpis.cur.c;
  const engaged = Math.round(s * (kpis.cur.e / 100));
  const rate = s ? (conv / s) * 100 : 0;
  const avgValue = conv ? kpis.cur.w / conv : 0;

  // simpele flow: meest gevolgde paginapad van alle bezoekers
  const home = Math.round(s * 0.6), aanbod = Math.round(s * 0.23), prijzen = Math.round(s * 0.115);
  const flowOption = {
    tooltip: { ...TT, trigger: "item", formatter: (p) =>
      p.dataType === "edge" ? p.data.source + " naar " + p.data.target + ": " + fmtInt(p.data.value) : p.name },
    series: [{ type: "sankey", left: 6, right: 70, top: 8, bottom: 8, nodeWidth: 9, nodeGap: 9, draggable: false,
      label: { fontFamily: "IBM Plex Mono", fontSize: 9, color: "#6E6879" },
      lineStyle: { color: "gradient", opacity: 0.28, curveness: 0.5 },
      itemStyle: { borderWidth: 0 },
      levels: [
        { depth: 0, itemStyle: { color: COLORS.magenta } },
        { depth: 1, itemStyle: { color: COLORS.magenta2 } },
        { depth: 2, itemStyle: { color: COLORS.violet } },
        { depth: 3, itemStyle: { color: COLORS.deepviolet } },
      ],
      data: [
        { name: "Sessies" }, { name: "/home" }, { name: "/aanbod" }, { name: "/prijzen" },
        { name: "Conversie" }, { name: "Exit" },
      ],
      links: [
        { source: "Sessies", target: "/home", value: home },
        { source: "Sessies", target: "Exit", value: s - home },
        { source: "/home", target: "/aanbod", value: aanbod },
        { source: "/home", target: "Exit", value: home - aanbod },
        { source: "/aanbod", target: "/prijzen", value: prijzen },
        { source: "/aanbod", target: "Exit", value: aanbod - prijzen },
        { source: "/prijzen", target: "Conversie", value: conv },
        { source: "/prijzen", target: "Exit", value: Math.max(0, prijzen - conv) },
      ] }],
  };

  const funnelOption = {
    tooltip: { ...TT, trigger: "item", formatter: (p) => p.name + ": " + fmtInt(p.value) },
    series: [{ type: "funnel", left: 6, right: 6, top: 4, bottom: 4, sort: "descending", gap: 3,
      minSize: "18%",
      label: { show: true, position: "inside", color: "#fff", fontFamily: "IBM Plex Mono", fontSize: 9,
        formatter: (p) => p.name },
      itemStyle: { borderWidth: 0 },
      data: [
        { name: "Sessies " + fmtInt(s), value: s, itemStyle: { color: COLORS.magenta } },
        { name: "Betrokken " + fmtInt(engaged), value: engaged, itemStyle: { color: COLORS.violet } },
        { name: "Conversies " + fmtInt(conv), value: conv, itemStyle: { color: COLORS.deepviolet } },
      ] }],
  };

  return (
    <Card>
      <div className="hrow">
        <div className="h1 disp">Userflow</div>
        <Seg value={mode} onChange={setMode} options={[
          { value: "flow", label: "Flow" }, { value: "funnel", label: "Funnel" },
        ]} />
      </div>
      {mode === "flow" ? (
        <>
          <div className="h2">Meest gevolgde paginapad van alle bezoekers</div>
          <Chart option={flowOption} height={216} />
        </>
      ) : (
        <>
          <div className="h2">Van sessie naar klant</div>
          <Chart option={funnelOption} height={118} />
          <div className="fstats">
            <div className="fstat"><div className="fl">Sessies</div><div className="fv disp">{fmtInt(s)}</div></div>
            <div className="fstat"><div className="fl">Conversies</div><div className="fv disp">{fmtInt(conv)}</div></div>
            <div className="fstat"><div className="fl">Conversieratio</div><div className="fv disp">{rate.toFixed(1).replace(".", ",")}%</div></div>
            <div className="fstat"><div className="fl">Gem. waarde p. klant</div><div className="fv disp">&euro;{fmtInt(avgValue)}</div></div>
          </div>
          <div className="splith">Split per product</div>
          <table className="compact">
            <thead><tr><th>Product</th><th className="num">Conv.</th><th className="num">Waarde</th></tr></thead>
            <tbody>{SPLIT_PRODUCT.map((r) => (
              <tr key={r.n}><td>{r.n}</td><td className="num mono">{fmtInt(r.c)}</td><td className="num mono">&euro;{fmtInt(r.w)}</td></tr>
            ))}</tbody>
          </table>
          <div className="splith">Split per beroep</div>
          <table className="compact">
            <thead><tr><th>Beroep</th><th className="num">Conv.</th><th className="num">Waarde</th></tr></thead>
            <tbody>{SPLIT_BEROEP.map((r) => (
              <tr key={r.n}><td>{r.n}</td><td className="num mono">{fmtInt(r.c)}</td><td className="num mono">&euro;{fmtInt(r.w)}</td></tr>
            ))}</tbody>
          </table>
        </>
      )}
    </Card>
  );
}

function MapCard({ countries }) {
  const [mapReady, setMapReady] = useState(null); // null=laden, true=ok, false=fout
  const [view, setView] = useState("land");
  const [hint, setHint] = useState("Tik op een stad om in te zoomen");
  const chartRef = useRef(null);

  const VIEWS = {
    land: { center: [5.4, 52.15], zoom: 16 },
    continent: { center: [10, 51], zoom: 4.4 },
    wereld: { center: [8, 20], zoom: 1.15 },
  };

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
    tooltip: { ...TT, trigger: "item", formatter: (p) =>
      p.seriesType === "effectScatter" ? p.name + ": " + fmtInt(p.value[2]) + " sessies" : p.name },
    geo: { map: "world", roam: true, center: VIEWS[view].center, zoom: VIEWS[view].zoom,
      itemStyle: { areaColor: "rgba(20,16,25,.05)", borderColor: "rgba(20,16,25,.16)", borderWidth: 0.5 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: "rgba(230,0,126,.28)" } },
      select: { disabled: true }, regions, scaleLimit: { min: 1, max: 60 } },
    series: [{ name: "steden", type: "effectScatter", coordinateSystem: "geo",
      data: view === "land" ? CITIES : [],
      symbolSize: (v) => 6 + v[2] / 220,
      rippleEffect: { scale: 2.4, brushType: "stroke" },
      itemStyle: { color: COLORS.magenta, shadowColor: "rgba(230,0,126,.6)", shadowBlur: 8 },
      label: { show: false } }],
  }), [view, mapReady]);

  function onClick(p) {
    if (view === "land" && p.seriesType === "effectScatter" && chartRef.current) {
      chartRef.current.setOption({ geo: { center: [p.value[0], p.value[1]], zoom: 46 } });
      setHint("Ingezoomd op " + p.name + ", kies Land om terug te gaan");
    }
  }

  return (
    <Card>
      <div className="hrow">
        <div>
          <div className="h1 disp">Locatie</div>
          <div className="h2">Sessies per gebied</div>
        </div>
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
      <div className="maplist">
        {countries.slice(0, 5).map((c) => (
          <div className="mstat" key={c.name}>{c.name}<b>{fmtInt(c.value)}</b></div>
        ))}
      </div>
    </Card>
  );
}
