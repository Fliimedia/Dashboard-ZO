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
        <div className="h1 disp">Targets</div>
        <div className="h2">Vul de doelen in; ze werken door in de prognose en de pacing</div>
        <div className="tgrid">
          {[
            { k: "tVisitors", l: "Bezoekers", real: kpis.cur.u, val: t.tVisitors },
            { k: "tConv", l: "Conversies", real: kpis.cur.c, val: t.tConv },
            { k: "tReach", l: "Reach", real: days.reduce((a, b) => a + (b.reach || 0), 0), val: t.tReach },
            { k: "tSpend", l: "Ad spend, euro", real: days.reduce((a, b) => a + (b.spend || 0), 0), val: t.tSpend },
          ].map((r) => {
            const pct = r.val ? Math.round((r.real / r.val) * 100) : 0;
            return (
              <div className="tgcard" key={r.k}>
                <div className="tgl">{r.l}</div>
                <div className="tgvals">
                  <div className="tgreal"><span className="mono">{fmtInt(r.real)}</span><em>realisatie</em></div>
                  <div className="tgin">
                    <input className="tin" type="number" value={r.val} onChange={(e) => updT(r.k, e.target.value)} />
                    <em>target</em>
                  </div>
                </div>
                <div className="minibar"><i className={pct >= 100 ? "ok" : ""} style={{ width: Math.min(100, pct) + "%" }} /></div>
                <div className="tgpct mono">{pct}% van doel</div>
              </div>
            );
          })}
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
        <div className="fctrls">
          <label>Groeitarget % <input className="tin" type="number" value={t.growthPct} onChange={(e) => updGrowth(e.target.value)} /></label>
          <label>Dagtarget conversies <input className="tin" type="number" value={t.dailyConv} onChange={(e) => updDaily(e.target.value)} /></label>
        </div>
        <div className="maphint">De projectielijn trekt de run-rate van de laatste 7 dagen door tot het einde van de periode. Het dagtarget stuurt ook de targetlijn op Result.</div>
      </Card>

    </div>
  );
}
