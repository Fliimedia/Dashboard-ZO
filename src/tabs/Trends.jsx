import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, fmtInt } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { KEYWORDS, SUBREDDITS } from "../data.js";

const MONTHS = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

function Spark({ change }) {
  const pts = [];
  let v = 50;
  for (let i = 0; i < 12; i++) { v = v * (1 + change / 100 / 14) + ((i * 7) % 5 - 2); pts.push(v); }
  const max = Math.max(...pts), min = Math.min(...pts), w = 72, h = 18;
  const col = change >= 0 ? COLORS.magenta : COLORS.deepviolet;
  const str = pts.map((p, i) =>
    (i * (w / 11)).toFixed(1) + "," + (h - 2 - ((p - min) / (max - min || 1)) * (h - 4)).toFixed(1)
  ).join(" ");
  return <svg width={w} height={h} style={{ verticalAlign: "middle" }}><polyline points={str} fill="none" stroke={col} strokeWidth="1.6" /></svg>;
}

export default function Trends() {
  const volOption = {
    grid: { left: 34, right: 8, top: 26, bottom: 22 },
    legend: { top: 0, right: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10,
      textStyle: { color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 9 } },
    tooltip: { ...TT, trigger: "axis" },
    xAxis: { ...AX, type: "category", data: MONTHS, boundaryGap: false },
    yAxis: { ...AX, type: "value", splitLine: SPLIT },
    series: [
      { name: "zelfstandigondernemers.nl", type: "line", data: [28,30,33,36,41,47,52,55,58,62,68,74],
        smooth: true, showSymbol: false, lineStyle: { width: 3, color: COLORS.magenta },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(230,0,126,.25)" }, { offset: 1, color: "rgba(230,0,126,0)" }]) } },
      { name: "AOV-categorie", type: "line", data: [52,54,55,58,63,70,78,84,88,91,95,100],
        smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: COLORS.violet } },
    ],
  };

  const POSTS = [
    { t: "Verplichte AOV komt eraan, wat betekent dit voor jullie premie?", m: "r/zzp, score 1.240, 318 reacties" },
    { t: "AOV tegenover broodfonds tegenover zelf sparen, mijn vergelijking na 3 jaar", m: "r/ondernemers, score 890, 204 reacties" },
    { t: "Welke AOV-aanbieder keert echt uit? Ervaringen gezocht", m: "r/geldzaken, score 512, 96 reacties" },
  ];

  return (
    <div className="view">
      <div className="r3">
        <Card>
          <div className="h1 disp">Zoekvolume</div>
          <div className="h2">Merk tegenover AOV-categorie, index per maand</div>
          <Chart option={volOption} height={210} />
        </Card>
        <Card>
          <div className="h1 disp">Brand subreddits</div>
          <div className="h2">5 communities, vermeldingen deze maand</div>
          {SUBREDDITS.map((r) => (
            <div className="rpost" key={r.n}>
              <div className="rpic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg></div>
              <div><div className="rt">{r.n}</div><div className="rm">{r.m} vermeldingen, {r.d}</div></div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <div className="h1 disp">Brand keywords</div>
        <div className="h2">10 kernwoorden voor zelfstandigondernemers.nl, maandvolume en trend</div>
        <div className="tscroll">
          <table style={{ minWidth: 520 }}>
            <thead><tr><th>Keyword</th><th className="num">Volume p.m.</th><th className="num">Verandering</th><th style={{ textAlign: "right" }}>12 mnd</th></tr></thead>
            <tbody>
              {KEYWORDS.map((r) => (
                <tr key={r.k}>
                  <td>{r.k}</td>
                  <td className="num mono">{fmtInt(r.v)}</td>
                  <td className="num mono"><span className={"kd " + (r.c >= 0 ? "up" : "down")} style={{ display: "inline" }}>{r.c >= 0 ? "+" : ""}{r.c}%</span></td>
                  <td style={{ textAlign: "right" }}><Spark change={r.c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="h1 disp">Reddit top posts</div>
        <div className="h2">Best scorende posts rond AOV en ondernemen</div>
        {POSTS.map((p) => (
          <div className="rpost" key={p.t}>
            <div className="rpic"><svg viewBox="0 0 24 24"><path d="M12 3l2 5h5l-4 3.5L16.5 17 12 14l-4.5 3L9 11.5 5 8h5z" /></svg></div>
            <div><div className="rt">{p.t}</div><div className="rm">{p.m}</div></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
