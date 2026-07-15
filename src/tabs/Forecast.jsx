import { useMemo, useState } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { getTargets, setTargets } from "../targets.js";
import { PERIOD_LABEL } from "../data.js";
import { useUI } from "../i18n.js";

const KPIS = [
  { id: "users", label: "Gebruikers" },
  { id: "conv", label: "Conversies" },
  { id: "value", label: "Conv.waarde" },
];

export default function Forecast({ data, period = "maand" }) {
  const plabel = PERIOD_LABEL[period] || "deze periode";
  const { theme } = useUI();
  const { kpis, days, periods } = data;
  const [kpi, setKpi] = useState("conv");
  const [t, setT] = useState(getTargets());

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


  // Periodetarget per KPI, uit de targetkaarten. Conversiewaarde is afgeleid van het conversietarget.
  const avgVal = kpis.cur.c ? kpis.cur.w / kpis.cur.c : 30;
  const periodTarget = kpi === "users" ? t.tVisitors : kpi === "conv" ? t.tConv : Math.round(t.tConv * avgVal);
  // De targetlijn is het dagtempo dat nodig is om het periodetarget te halen.
  const targetLine = useMemo(() => {
    const n = days.length || 1;
    return days.map(() => Math.round(periodTarget / n));
  }, [days, periodTarget]);

  const chartOption = useMemo(() => ({
    grid: { left: 44, right: 10, top: 26, bottom: 22 },
    legend: { top: 0, right: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10, data: ["Resultaat", "Projectie", "Target"],
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
      const last = vals[vals.length - 1] || 0;
      const ext = Math.max(2, Math.round(days.length * 0.14));
      const rr = vals.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, Math.max(1, vals.length));
      const projTail = Array(ext).fill(0).map((_, i) => Math.round(last + (rr - last) * ((i + 1) / ext)));
      // band: pincht dicht op vandaag, verbreedt naar het einde
      const lead = Array(Math.max(0, vals.length - 1)).fill(null);
      const lo = projTail.map((v, i) => Math.round(v * (1 - (0.05 + 0.16 * ((i + 1) / ext)))));
      const hiDelta = projTail.map((v, i) => Math.round(v * (1 + (0.05 + 0.16 * ((i + 1) / ext)))) - lo[i]);
      return [
        // onzichtbare ondergrens + gevulde band als bandbreedte erbovenop
        { name: "lo", type: "line", stack: "band", symbol: "none", silent: true,
          data: [...lead, last, ...lo], lineStyle: { opacity: 0 }, z: 1 },
        { name: "Onzekerheid", type: "line", stack: "band", symbol: "none", silent: true,
          data: [...lead, 0, ...hiDelta], lineStyle: { opacity: 0 },
          areaStyle: { color: "rgba(230,0,126,.12)" }, z: 1 },
        { name: "Resultaat", type: "line", data: vals, smooth: true, showSymbol: false, z: 3,
          lineStyle: { width: 3, color: COLORS.magenta }, itemStyle: { color: COLORS.magenta },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(230,0,126,.22)" }, { offset: 1, color: "rgba(230,0,126,0)" }]) } },
        { name: "Projectie", type: "line", smooth: true, showSymbol: false, z: 3,
          data: [...lead, last, ...projTail],
          lineStyle: { width: 2, type: "dotted", color: COLORS.magenta }, itemStyle: { color: COLORS.magenta } },
        { name: "Target", type: "line", data: [...targetLine, ...Array(ext).fill(targetLine[0])], showSymbol: false, z: 2,
          lineStyle: { width: 2, type: "dashed", color: COLORS.deepviolet }, itemStyle: { color: COLORS.deepviolet } },
      ];
    })(),
  }), [days, series, kpi, targetLine, theme]);

  // Haalbaarheid: projectie einde periode tegen het periodetarget
  const achieve = useMemo(() => {
    const vals = series[kpi] || [];
    const last = vals[vals.length - 1] || 0;
    const ext = Math.max(2, Math.round(days.length * 0.14));
    const rr = vals.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, Math.max(1, vals.length));
    const done = vals.reduce((a, b) => a + b, 0);
    const projExtra = Array(ext).fill(0).reduce((a, _, i) => a + Math.round(last + (rr - last) * ((i + 1) / ext)), 0);
    // projectie voor het resterende deel van de periode: run-rate over de nog te gane dagen
    const remaining = Math.max(0, days.length - vals.length);
    const projTotal = done + Math.round(rr * remaining);
    const pct = periodTarget ? Math.round((projTotal / periodTarget) * 100) : 0;
    const gap = projTotal - periodTarget;
    return { projTotal, pct, gap };
  }, [series, kpi, days, periodTarget]);



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
        <div className={"achieve " + (achieve.gap >= 0 ? "ok" : "no")}>
          <div className="acbig disp">{achieve.pct}%</div>
          <div className="actxt">
            Bij dit tempo kom je uit op <b>{fmtInt(achieve.projTotal)}</b> {KPIS.find((k) => k.id === kpi)?.label.toLowerCase()}, tegen een doel van {fmtInt(periodTarget)}.
            {achieve.gap >= 0
              ? <> Je <b>overtreft</b> je doel met {fmtInt(achieve.gap)}.</>
              : <> Je komt <b>{fmtInt(Math.abs(achieve.gap))}</b> tekort.</>}
          </div>
        </div>
        <div className="maphint">De band toont de onzekerheid: de projectie verbreedt naar het einde van de periode. Stel je doel in bij de targetkaarten hierboven.</div>
      </Card>

    </div>
  );
}
