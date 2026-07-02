import { useEffect, useState } from "react";
import Result from "./tabs/Result.jsx";
import Trends from "./tabs/Trends.jsx";
import Insights from "./tabs/Insights.jsx";
import Models from "./tabs/Models.jsx";
import { fetchData, demoData, CLIENTS } from "./data.js";

const LOGO_PATH = "m 239.8092,332.68537 c -2.28447,-3.49286 -23.46567,-48.57731 -23.46567,-50.01464 0,-0.93415 13.88823,-0.66647 21.30481,-0.87484 7.75505,-0.21787 53.41913,-115.30501 53.06132,-114.03739 -1.54162,5.46154 -1.00892,4.30871 -0.54189,0.14626 L 322.17232,168.5 H 349.5 v 82.5 82.5 h -22 -22 l -0.26195,-38.32102 c -0.30405,-44.48 7.24157,-55.84478 -0.8773,-38.24361 -11.37304,20.61415 -25.02431,56.46612 -37.2072,76.63979 C 266.40468,334.4775 262.28909,334 253.90061,334 c -11.19087,0 -12.7022,0.80941 -14.09141,-1.31463 z m -82.3413,-2.91541 C 157.20134,329.07148 157.09952,292.5 157.24162,248.5 l 0.25838,-80 58.25,-0.25806 c 55.01074,-0.24371 59.35516,-1.52083 59.35032,0.13946 -0.003,0.96693 -4.62864,12.78964 -10.28528,24.20363 L 254.96003,214.35034 227.97492,214 201.5,214.5 v 13.5 13.5 l 19.3529,0.27195 19.3529,0.27196 0.91723,0.0629 c 1.38257,0.0949 -3.92785,10.20835 -7.20338,17.07342 l -6.24989,13.09893 -13.33998,-0.0597 L 201.5,272.5 l -0.5,29 -0.5,29 -21.27373,0.26996 c -16.47548,0.20907 -21.38304,-0.0165 -21.75837,-1 z";

export function BrandMark({ size = 29 }) {
  return (
    <div className="brandmark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 500 500"><path fill="#fff" d={LOGO_PATH} /></svg>
    </div>
  );
}

const IC = {
  result: <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 3 4-6" /></svg>,
  trends: <svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-8" /><path d="M21 7h-4M21 7v4" /></svg>,
  insights: <svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z" /></svg>,
  models: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>,
};

const TABS = [
  { id: "result", label: "Result" },
  { id: "trends", label: "Trends" },
  { id: "insights", label: "Insights" },
  { id: "models", label: "Models" },
];

function AcctIcon() {
  return (
    <div className="acct">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" /></svg>
    </div>
  );
}
function SearchBox({ placeholder }) {
  return (
    <div className="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <input placeholder={placeholder} />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("result");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchData(CLIENTS[0].id)
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData(demoData()); });
    return () => { alive = false; };
  }, []);

  const d = data || demoData();
  const title = TABS.find((t) => t.id === tab)?.label || "";

  return (
    <>
      <div className="frame">
        <div className="side">
          <div className="brand"><BrandMark /><div className="brandname">Performance OS</div></div>
          {TABS.map((t) => (
            <div key={t.id} className={"mitem" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              <div className="micon">{IC[t.id]}</div><span>{t.label}</span>
            </div>
          ))}
        </div>

        <div className="mainc">
          <div className="mobilehead">
            <BrandMark size={34} />
            <SearchBox placeholder="Zoeken" />
            <AcctIcon />
          </div>
          <div className="topbar">
            <div className="crumbs">
              <div className="path">Pagina's / <b>{title}</b></div>
              <div className="title">{title}</div>
            </div>
            <SearchBox placeholder="Typ hier..." />
            {!d.live && <span className="demobadge">demo data</span>}
            <AcctIcon />
          </div>

          {tab === "result" && <Result data={d} goTrends={() => setTab("trends")} />}
          {tab === "trends" && <Trends />}
          {tab === "insights" && <Insights data={d} />}
          {tab === "models" && <Models data={d} />}
        </div>
      </div>

      <div className="bottomnav">
        {TABS.map((t) => (
          <div key={t.id} className={"bni" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
            {IC[t.id]}<span>{t.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
