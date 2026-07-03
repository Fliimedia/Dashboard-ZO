import { useMemo, useState } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { getTargets, setTargets } from "../targets.js";

const KPIS = [
  { id: "users", label: "Gebruikers" },
  { id: "conv", label: "Conversies" },
  { id: "value", label: "Conv.waarde" },
];

export default function Forecast({ data }) {
  const { kpis, days, periods } = data;
  const [kpi, setKpi] = useState("conv");
  const [t, setT] = useState(getTargets());

  function updGrowth(v) { setT(setTargets({ growthPct: Math.max(0, Number(v) || 0) })); }
  function updDaily(v) { setT(setTargets({ dailyConv: Math.max(1, Number(v) || 1) })); }

  // dagreeksen per KPI: gebruikers en waarde afgeleid van sessies (demo of live-benadering)
  const series = useMemo(() => {
    const conv = days.map((d) => d.c);
    // echte dagwaarden indien aanwezig, anders afgeleid van sessies
    const users = days.map((d) => d.u != null ? d.u : Math.round(d.s * (kpis.cur.u / Math.max(1, kpis.cur.s))));
    const avgVal = kpis.cur.c ? kpis.cur.w / kpis.cur.c : 30;
    const value = days.map((d) => d.w != null && d.w > 0 ? d.w : Math.round(d.c * avgVal));
    return { users, conv, value };
  }, [days, kpis]);

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
    xAxis: { ...AX, type: "category", data: days.map((d) => d.date), boundaryGap: false,
      axisLabel: { ...AX.axisLabel, interval: Math.max(1, Math.floor(days.length / 7)) } },
    yAxis: { ...AX, type: "value", splitLine: SPLIT },
    series: [
      { name: "Resultaat", type: "line", data: series[kpi], smooth: true, showSymbol: false,
        lineStyle: { width: 3, color: COLORS.magenta }, itemStyle: { color: COLORS.magenta },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(230,0,126,.22)" }, { offset: 1, color: "rgba(230,0,126,0)" }]) } },
      { name: "Target", type: "line", data: targetLine, showSymbol: false,
        lineStyle: { width: 2, type: "dashed", color: COLORS.deepviolet },
        itemStyle: { color: COLORS.deepviolet } },
    ],
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
