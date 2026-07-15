import { useMemo, useState } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { getTargets, setTargets } from "../targets.js";
import { PERIOD_LABEL } from "../data.js";

const KPIS = [
  { id: "users", label: "Gebruikers" },
  { id: "conv", label: "Conversies" },
  { id: "value", label: "Conv.waarde" },
];

export default function Forecast({ data, period = "maand" }) {
  const plabel = PERIOD_LABEL[period] || "deze periode";
  const { kpis, days, periods } = data;
  const [kpi, setKpi] = useState("conv");
  const [t, setT] = useState(getTargets());

  function updGrowth(v) { setT(setTargets({ growthPct: Math.max(0, Number(v) || 0) })); }
  function updDaily(v) { setT(setTargets({ dailyConv: Math.max(1, Number(v) || 1) })); }
  function updT(key, v) { setT(setTargets({ [key]: Math.max(0, Number(v) || 0) })); }

  // dagreeksen per KPI: gebruikers en waarde afgeleid van sessies (demo of live-benadering)
  const series = useMemo(() => {
    const conv = days.map((d) => d.c);
    // echte dagwaarden indien aanwezig, anders afgeleid van sessies
    const users = days.map((d) => d.u != null ? d.u : Math.round(d.s * (kpis.cur.u / Math.max(1, kpis.cur.s))));
    const avgVal = kpis.cur.c ? kpis.cur.w / kpis.cur.c : 30;
    const value = days.map((d) => d.w != null && d.w > 0 ? d.w : Math.round(d.c * avgVal));
    return { users, conv, value };
  }, [days, kpis]);

  // Doelvoortgang: realisatie, doel en projectie op run-rate van de laatste 7 dagen
  const pacing = useMemo(() => {
    const n = days.length || 1;
    const vals = series[kpi] || [];
    const done = vals.reduce((a, b) => a + b, 0);
    const rr = vals.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, Math.max(1, vals.length));
    const goal = kpi === "conv" ? t.dailyConv * n
      : kpi === "users" ? Math.round((kpis.prev.u || kpis.cur.u) * (1 + t.growthPct / 100))
      : Math.round(((kpis.prev.c || kpis.cur.c) * (kpis.cur.c ? kpis.cur.w / kpis.cur.c : 30)) * (1 + t.growthPct / 100));
    const proj = Math.round(rr * n);
    const pct = goal ? Math.round((done / goal) * 100) : 0;
    return { done, goal, proj, pct, ok: proj >= goal };
  }, [series, kpi, days, t, kpis]);

  // targetlijn per KPI: conversies via ingesteld dagtarget, anders vorige periode plus groeitarget
  const targetLine = useMemo(() => {
    const n = days.length || 1;
    if (kpi === "conv") return days.map(() => t.dailyConv);
    const prevAvgUsers = (kpis.prev.u || kpis.cur.u) / n;
    const avgVal = kpis.cur.c ? kpis.cur.w / kpis.cur.c : 30;
    const prevAvgValue = ((kpis.prev.c || kpis.cur.c) * avgVal) / n;
    const base = kpi === "users" ? prevAvgUsers : prevAvgValue;
    return days.map(() => Math.round(base * (1 + t.growthPct / 100)));
  }, [kpi, days, kpis, t]);

  const chartOption = useMemo(() => ({
    grid: { left: 44, right: 10, top: 26, bottom: 22 },
    legend: { top: 0, right: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10,
      textStyle: { color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 9 } },
    tooltip: { ...TT, trigger: "axis" },
    xAxis: { ...AX, type: "category",
      data: (() => {
        const ext = Math.max(2, Math.round(days.length * 0.14));
        return [...days.map((d) => d.date), ...Array(ext).fill(0).map((_, i) => "+" + (i + 1))];
      })(), boundaryGap: false,
      axisLabel: { ...AX.axisLabel, interval: Math.max(1, Math.floor(days.length / 6)) } },
    yAxis: { ...AX, type: "value", splitLine: SPLIT },
    series: (() => {
      const vals = series[kpi] || [];
      const ext = Math.max(2, Math.round(days.length * 0.14));
      const rr = vals.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, Math.max(1, vals.length));
      const projTail = Array(ext).fill(0).map((_, i) => Math.round(vals[vals.length - 1] + (rr - vals[vals.length - 1]) * ((i + 1) / ext)));
      return [
        { name: "Resultaat", type: "line", data: vals, smooth: true, showSymbol: false,
          lineStyle: { width: 3, color: COLORS.magenta }, itemStyle: { color: COLORS.magenta },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(230,0,126,.22)" }, { offset: 1, color: "rgba(230,0,126,0)" }]) } },
        { name: "Projectie", type: "line", smooth: true, showSymbol: false,
          data: [...Array(Math.max(0, vals.length - 1)).fill(null), vals[vals.length - 1], ...projTail],
          lineStyle: { width: 2, type: "dotted", color: COLORS.mist }, itemStyle: { color: COLORS.mist } },
        { name: "Target", type: "line", data: [...targetLine, ...Array(ext).fill(targetLine[0])], showSymbol: false,
          lineStyle: { width: 2, type: "dashed", color: COLORS.deepviolet },
          itemStyle: { color: COLORS.deepviolet } },
      ];
    })(),
  }), [days, series, kpi, targetLine]);

  // trendtabel: MoM, QoQ en YoY elk uit hun eigen cur/base-venster
  const rows = useMemo(() => {
    const P = periods || {};
    const d = (cad, key) => {
      const c = P[cad]; if (!c || !c.cur || !c.base) return null;
      const base = c.base[key], cur = c.cur[key];
      return base ? Math.round(((cur - base) / base) * 100) : null;
    };
    const row = (label, key) => ({ l: label, mom: d("mom", key), qoq: d("qoq", key), yoy: d("yoy", key) });
    return [row("Gebruikers", "u"), row("Conversies", "c"), row("Conversiewaarde", "w")];
  }, [periods]);

  const Cell = ({ v }) => (
    <td className="num mono">
      {v === null || v === undefined
        ? <span style={{ color: "var(--dim)" }}>n.v.t.</span>
        : <span className={"kd " + (v >= t.growthPct ? "up" : "down")} style={{ display: "inline" }}>{v >= 0 ? "+" : ""}{v}%</span>}
    </td>
  );

  return (
    <div className="view">
      <Card>
        <div className="pacerow">
          <div className="pace"><div className="pl">Realisatie</div><div className="pv disp">{fmtInt(pacing.done)}</div></div>
          <div className="pace"><div className="pl">Doel</div><div className="pv disp">{fmtInt(pacing.goal)}</div></div>
          <div className="pace"><div className="pl">Projectie</div><div className="pv disp">{fmtInt(pacing.proj)}</div></div>
          <div className="pacefill">
            <div className="pl">{pacing.pct}% van doel <span className={"pstat " + (pacing.ok ? "ok" : "no")}>{pacing.ok ? "op koers" : "achter op doel"}</span></div>
            <div className="pbar"><i style={{ width: Math.min(100, pacing.pct) + "%" }} /></div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="h1 disp">Targets</div>
        <div className="h2">Vul de doelen in; ze werken door in de prognose en de pacing</div>
        <table className="compact targettbl">
          <thead><tr><th>KPI</th><th className="num">Realisatie</th><th className="num">Target</th><th className="num">Voortgang</th></tr></thead>
          <tbody>
            {[
              { k: "tVisitors", l: "Bezoekers", real: kpis.cur.u, val: t.tVisitors },
              { k: "tConv", l: "Conversies", real: kpis.cur.c, val: t.tConv },
              { k: "tReach", l: "Reach", real: days.reduce((a, b) => a + (b.reach || 0), 0), val: t.tReach },
              { k: "tSpend", l: "Ad spend, euro", real: days.reduce((a, b) => a + (b.spend || 0), 0), val: t.tSpend },
            ].map((r) => {
              const pct = r.val ? Math.round((r.real / r.val) * 100) : 0;
              return (
                <tr key={r.k}>
                  <td>{r.l}</td>
                  <td className="num mono">{fmtInt(r.real)}</td>
                  <td className="num"><input className="tin" type="number" value={r.val} onChange={(e) => updT(r.k, e.target.value)} /></td>
                  <td className="num"><div className="minibar"><i className={pct >= 100 ? "ok" : ""} style={{ width: Math.min(100, pct) + "%" }} /></div><span className="mono" style={{ fontSize: 10 }}>{pct}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="h1 disp">Acquisitietrechter</div>
        <div className="h2">Van ad spend naar reach naar bezoekers naar conversie, over de {plabel}</div>
        <Chart height={150} option={(() => {
          const spend = days.reduce((a, b) => a + (b.spend || 0), 0);
          const reach = days.reduce((a, b) => a + (b.reach || 0), 0);
          const vis = kpis.cur.u, conv = kpis.cur.c;
          const data = [
            { name: "Ad spend, euro", value: spend }, { name: "Reach", value: reach },
            { name: "Bezoekers", value: vis }, { name: "Conversie", value: conv },
          ];
          const COLS = [COLORS.deepviolet, "#141019", COLORS.magenta2 || COLORS.magenta, COLORS.magenta];
          return {
            tooltip: { ...TT, trigger: "item", formatter: (p) => p.name + ": " + fmtInt(p.value) },
            series: [{ type: "funnel", funnelAlign: "center", orient: "horizontal",
              left: 6, right: 6, top: 6, bottom: 22, sort: "descending", gap: 2, minSize: "22%", maxSize: "100%",
              label: { show: true, position: "bottom", color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 8.5, formatter: (p) => p.name + "\n" + fmtInt(p.value) },
              labelLine: { show: false }, itemStyle: { borderWidth: 0 },
              data: data.map((d, i) => ({ ...d, itemStyle: { color: COLS[i] } })) }],
          };
        })()} />
        <div className="fdrops">
          {(() => {
            const spend = days.reduce((a, b) => a + (b.spend || 0), 0);
            const reach = days.reduce((a, b) => a + (b.reach || 0), 0);
            const cpm = reach ? (spend / reach) * 1000 : 0;
            const cpc = kpis.cur.u ? spend / kpis.cur.u : 0;
            const cpa = kpis.cur.c ? spend / kpis.cur.c : 0;
            return [
              { l: "CPM", v: "\u20ac" + cpm.toFixed(2).replace(".", ",") },
              { l: "Kosten per bezoeker", v: "\u20ac" + cpc.toFixed(2).replace(".", ",") },
              { l: "CPA", v: "\u20ac" + cpa.toFixed(2).replace(".", ",") },
            ].map((x) => <div className="fdrop" key={x.l}><span>{x.l}</span><b>{x.v}</b></div>);
          })()}
        </div>
      </Card>

      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">KPI prognose en target</div>
            <div className="h2">Resultaat per dag met de uitgetekende targetlijn</div>
          </div>
          <Seg value={kpi} onChange={setKpi} options={KPIS.map((k) => ({ value: k.id, label: k.label }))} />
        </div>
        <Chart option={chartOption} height={226} />
      </Card>

      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Trends op KPI's</div>
            <div className="h2">Procentuele ontwikkeling tegenover target</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="rm mono" style={{ fontSize: 10, color: "var(--mist)" }}>
              Groeitarget % <input className="tin" type="number" value={t.growthPct} onChange={(e) => updGrowth(e.target.value)} />
            </label>
            <label className="rm mono" style={{ fontSize: 10, color: "var(--mist)" }}>
              Dagtarget conv. <input className="tin" type="number" value={t.dailyConv} onChange={(e) => updDaily(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="tscroll">
          <table style={{ minWidth: 460 }}>
            <thead><tr><th>KPI</th><th className="num">MoM</th><th className="num">QoQ</th><th className="num">YoY</th><th className="num">Target</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.l}>
                  <td>{r.l}</td>
                  <Cell v={r.mom} /><Cell v={r.qoq} /><Cell v={r.yoy} />
                  <td className="num mono">+{t.growthPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="maphint">Kleur toont of de trend het groeitarget haalt. Het dagtarget voor conversies stuurt ook de targetlijn op Result. n.v.t. betekent dat de vergelijkingsperiode nog geen data heeft.</div>
      </Card>
    </div>
  );
}
