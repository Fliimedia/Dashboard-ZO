import { useMemo } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, fmtInt } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";

const TARGET_PERIOD = 18000;

export default function Models({ data }) {
  const { kpis, days } = data;

  // lineaire trend op de laatste 30 dagen voor een eenvoudige prognose
  const { forecastOption, projTotal } = useMemo(() => {
    const ys = days.map((d) => d.s);
    const n = ys.length || 1;
    const xm = (n - 1) / 2, ym = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    ys.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) * (x - xm); });
    const slope = den ? num / den : 0, icpt = ym - slope * xm;
    const labels = [], act = [], proj = [];
    for (let i = 0; i < n; i++) { labels.push(i + 1); act.push(ys[i]); proj.push(null); }
    if (n > 0) proj[n - 1] = ys[n - 1];
    let total = 0;
    for (let j = 1; j <= 10; j++) {
      const v = Math.max(0, Math.round(icpt + slope * (n - 1 + j)));
      labels.push(n + j); act.push(null); proj.push(v); total += v;
    }
    const projTotal = kpis.cur.s + total;
    const forecastOption = {
      grid: { left: 36, right: 10, top: 12, bottom: 22 },
      tooltip: { ...TT, trigger: "axis" },
      xAxis: { ...AX, type: "category", data: labels },
      yAxis: { ...AX, type: "value", splitLine: SPLIT },
      series: [
        { name: "Werkelijk", type: "line", data: act, smooth: true, showSymbol: false,
          lineStyle: { width: 3, color: COLORS.magenta },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(230,0,126,.22)" }, { offset: 1, color: "rgba(230,0,126,0)" }]) } },
        { name: "Prognose", type: "line", data: proj, smooth: true, showSymbol: false,
          lineStyle: { width: 2.5, type: "dashed", color: COLORS.deepviolet } },
      ],
    };
    return { forecastOption, projTotal };
  }, [days, kpis]);

  const pct = Math.min(100, Math.round((kpis.cur.s / TARGET_PERIOD) * 100));
  const remaining = Math.max(0, TARGET_PERIOD - kpis.cur.s);
  const pace = Math.ceil(remaining / 10);

  return (
    <div className="view">
      <div className="tile3">
        <Card className="tile"><div className="tl">Sessies deze periode</div><div className="tv disp">{fmtInt(kpis.cur.s)}</div><div className="td">30 dagen</div></Card>
        <Card className="tile"><div className="tl">Prognose incl. 10 dagen</div><div className="tv disp">{fmtInt(projTotal)}</div><div className="td" style={{ color: "var(--pos)" }}>op basis van lineaire trend</div></Card>
        <Card className="tile"><div className="tl">Voortgang naar target</div><div className="tv disp">{pct}%</div><div className="td">{fmtInt(kpis.cur.s)} van {fmtInt(TARGET_PERIOD)}</div></Card>
      </div>
      <Card>
        <div className="h1 disp">Prognose sessies</div>
        <div className="h2">Werkelijk verloop met projectie</div>
        <Chart option={forecastOption} height={220} />
      </Card>
      <Card>
        <div className="h1 disp">Target</div>
        <div className="h2">Doel: {fmtInt(TARGET_PERIOD)} sessies per periode. Benodigd dagtempo voor de resterende 10 dagen: {fmtInt(pace)} sessies per dag.</div>
      </Card>
    </div>
  );
}
