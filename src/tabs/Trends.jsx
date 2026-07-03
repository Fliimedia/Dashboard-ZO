import { useEffect, useMemo, useState } from "react";
import * as echarts from "echarts";
import Chart from "../components/Chart.jsx";
import { Card, Seg, fmtInt } from "../components/ui.jsx";
import { AX, TT, SPLIT, COLORS } from "../echartsSetup.js";
import { KEYWORDS, KEYWORDS_ESTIMATED, SUBREDDITS } from "../data.js";

const MONTHS = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const QUARTERS = ["K3 '24","K4 '24","K1 '25","K2 '25","K3 '25","K4 '25","K1 '26","K2 '26"];
const YEARS = ["2022","2023","2024","2025","2026"];

// Deterministische demo-reeks per keyword en periode, gebaseerd op volume en trend
function seriesFor(kw, period) {
  const n = period === "maand" ? 12 : period === "kwartaal" ? 8 : 5;
  const labels = period === "maand" ? MONTHS : period === "kwartaal" ? QUARTERS : YEARS;
  const growth = kw.c / 100;
  const out = [];
  let v = kw.v / (1 + growth);
  for (let i = 0; i < n; i++) {
    const wobble = ((i * 7 + kw.k.length * 3) % 9 - 4) / 100;
    v = v * (1 + growth / n + wobble / 3);
    out.push(Math.max(1, Math.round(v)));
  }
  return { labels, values: out };
}

function volLabel(period) {
  return period === "maand" ? "p.m." : period === "kwartaal" ? "p.kw." : "p.j.";
}
function volFor(kw, period) {
  return period === "maand" ? kw.v : period === "kwartaal" ? kw.v * 3 : kw.v * 12;
}

const REDDIT_T = { alltime: "all", jaar: "year", maand: "month", dag: "day" };
const DEMO_POSTS = [
  { t: "Verplichte AOV komt eraan, wat betekent dit voor jullie premie?", sub: "r/zzp", score: 1240, com: 318, url: "https://www.reddit.com/r/zzp" },
  { t: "AOV tegenover broodfonds tegenover zelf sparen, mijn vergelijking na 3 jaar", sub: "r/ondernemers", score: 890, com: 204, url: "https://www.reddit.com/r/ondernemers" },
  { t: "Welke AOV-aanbieder keert echt uit? Ervaringen gezocht", sub: "r/geldzaken", score: 512, com: 96, url: "https://www.reddit.com/r/geldzaken" },
];

export default function Trends() {
  const [period, setPeriod] = useState("maand");
  const [kwSel, setKwSel] = useState(KEYWORDS[0].k);
  const [rt, setRt] = useState("maand");
  const [posts, setPosts] = useState(null); // null = laden

  const kw = KEYWORDS.find((k) => k.k === kwSel) || KEYWORDS[0];
  const { labels, values } = useMemo(() => seriesFor(kw, period), [kw, period]);

  const volOption = useMemo(() => ({
    grid: { left: 44, right: 8, top: 26, bottom: 22 },
    legend: { top: 0, right: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10,
      textStyle: { color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 9 } },
    tooltip: { ...TT, trigger: "axis" },
    xAxis: { ...AX, type: "category", data: labels, boundaryGap: false },
    yAxis: { ...AX, type: "value", splitLine: SPLIT },
    series: [{
      name: kw.k, type: "line", data: values, smooth: true, showSymbol: false,
      lineStyle: { width: 3, color: COLORS.magenta },
      itemStyle: { color: COLORS.magenta },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "rgba(28,46,112,.24)" }, { offset: 1, color: "rgba(28,46,112,0)" }]) },
    }],
  }), [labels, values, kw]);

  // Reddit: top 10 van de periode uit de 5 brand subreddits
  useEffect(() => {
    let alive = true;
    setPosts(null);
    const subs = SUBREDDITS.map((s) => s.n.replace("r/", "")).join("+");
    // eigen serverless endpoint eerst, publieke proxy als terugval, dan demo
    fetch("/api/reddit?subs=" + subs + "&t=" + REDDIT_T[rt] + "&limit=10")
      .then((r) => { if (!r.ok) throw 0; return r.json(); })
      .then((j) => { if (!alive) return; setPosts((j.posts && j.posts.length) ? j.posts : DEMO_POSTS); })
      .catch(() => {
        const url = "https://www.reddit.com/r/" + subs + "/top.json?limit=10&t=" + REDDIT_T[rt] + "&raw_json=1";
        fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url))
          .then((r) => { if (!r.ok) throw 0; return r.json(); })
          .then((j) => {
            if (!alive) return;
            const list = (j?.data?.children || []).map((c) => ({
              t: c.data.title, sub: "r/" + c.data.subreddit,
              score: c.data.score, com: c.data.num_comments,
              url: "https://www.reddit.com" + c.data.permalink,
            }));
            setPosts(list.length ? list : DEMO_POSTS);
          })
          .catch(() => { if (alive) setPosts(DEMO_POSTS); });
      });
    return () => { alive = false; };
  }, [rt]);

  return (
    <div className="view">
      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Brand keywords</div>
            <div className="h2">Klik een keyword voor het zoekvolume, 10 kernwoorden voor zelfstandigondernemers.nl{KEYWORDS_ESTIMATED && <span className="demobadge" style={{ marginLeft: 8 }}>geschat</span>}</div>
          </div>
          <Seg value={period} onChange={setPeriod} options={[
            { value: "maand", label: "Maand" }, { value: "kwartaal", label: "Kwartaal" }, { value: "jaar", label: "Jaar" },
          ]} />
        </div>
        <div className="r3" style={{ marginTop: 6 }}>
          <Chart option={volOption} height={238} />
          <div className="kwscroll">
            <table className="compact" style={{ width: "100%" }}>
              <thead><tr><th>Keyword</th><th className="num">Zoekvol. {volLabel(period)}</th><th className="num">Trend</th></tr></thead>
              <tbody>
                {KEYWORDS.map((r) => (
                  <tr key={r.k} className={"click" + (r.k === kwSel ? " sel" : "")} onClick={() => setKwSel(r.k)}>
                    <td style={{ whiteSpace: "normal" }}>{r.k}</td>
                    <td className="num mono">{fmtInt(volFor(r, period))}</td>
                    <td className="num mono"><span className={"kd " + (r.c >= 0 ? "up" : "down")} style={{ display: "inline" }}>{r.c >= 0 ? "+" : ""}{r.c}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Reddit top posts</div>
            <div className="h2">Top 10 van de periode uit de brand subreddits</div>
          </div>
          <Seg value={rt} onChange={setRt} options={[
            { value: "alltime", label: "All time" }, { value: "jaar", label: "Jaar" },
            { value: "maand", label: "Maand" }, { value: "dag", label: "Dag" },
          ]} />
        </div>
        <div className="chips">
          {SUBREDDITS.map((s) => <span className="chip" key={s.n}>{s.n}</span>)}
        </div>
        {posts === null && <div className="mapmsg" style={{ height: 60 }}>Posts laden...</div>}
        {posts && posts.map((p) => (
          <div className="rpost" key={p.url + p.t}>
            <div className="rpic"><svg viewBox="0 0 24 24"><path d="M12 3l2 5h5l-4 3.5L16.5 17 12 14l-4.5 3L9 11.5 5 8h5z" /></svg></div>
            <div style={{ minWidth: 0 }}>
              <div className="rt">{p.t}</div>
              <div className="rm">{p.sub}, score {fmtInt(p.score)}, {fmtInt(p.com)} reacties</div>
            </div>
            <a className="golink" href={p.url} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8" /></svg>
            </a>
          </div>
        ))}
      </Card>
    </div>
  );
}
