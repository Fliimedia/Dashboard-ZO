import React, { useState, useEffect, useMemo } from "react";
import { CLIENTS, RANGES, ranges, reportDefs, parse } from "./data";
import Performance from "./tabs/Performance.jsx";
import Trends from "./tabs/Trends.jsx";
import Models from "./tabs/Models.jsx";
import Insights from "./tabs/Insights.jsx";

const TABS = [["performance", "Performance"], ["trends", "Trends"], ["models", "Models"], ["insights", "Insights"]];

export default function App() {
  const [client, setClient] = useState(() => { try { return JSON.parse(localStorage.getItem("pos_client")) || CLIENTS[0]; } catch (e) { return CLIENTS[0]; } });
  const [rangeId, setRangeId] = useState("30d");
  const [tab, setTab] = useState("performance");
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const rg = useMemo(() => ranges(rangeId), [rangeId]);

  useEffect(() => { localStorage.setItem("pos_client", JSON.stringify(client)); }, [client]);
  useEffect(() => { load(); }, [client, rangeId]);

  async function load() {
    setStatus("loading"); setError(""); setData(null);
    try {
      const res = await fetch("/api/ga", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: client.id, reports: reportDefs(rg.cur, rg.prev) }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || ("status " + res.status));
      setData(parse(j)); setStatus("done");
    } catch (e) { setError(e.message || "Kon geen data laden."); setStatus("error"); }
  }

  return (
    <div>
      <div className="top">
        <div className="orb" />
        <div className="wrap">
          <div className="brandrow">
            <span className={"dot" + (status === "loading" ? " pulse" : "")} />
            <span className="brand">Performance OS</span>
            <span className="brandsub">by Flii</span>
          </div>
          <div className="h1 disp">{client.name}</div>
          <div className="controls">
            <div className="field">
              <label>Klant</label>
              <select value={client.id} onChange={(e) => setClient(CLIENTS.find((c) => c.id === e.target.value) || CLIENTS[0])}>
                {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Periode</label>
              <select value={rangeId} onChange={(e) => setRangeId(e.target.value)}>
                {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <span className="period">{rg.cur.startDate} tot {rg.cur.endDate}</span>
          </div>
          <div className="tabs">
            {TABS.map(([id, l]) => <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>)}
          </div>
        </div>
      </div>

      <div className="wrap">
        {status === "error" && <div className="err"><strong style={{ color: "var(--magenta)" }}>Er ging iets mis.</strong><div style={{ marginTop: 6 }}>{error}</div><button className="btn ghost" style={{ marginTop: 12 }} onClick={load}>Opnieuw</button></div>}
        {status === "loading" && <p className="mono" style={{ color: "var(--mist)", marginTop: 24 }}>Cijfers laden uit GA4...</p>}

        {data && tab === "performance" && <Performance d={data} />}
        {data && tab === "trends" && <Trends d={data} client={client} />}
        {data && tab === "models" && <Models d={data} days={rg.days} />}
        {data && tab === "insights" && <Insights d={data} client={client} rg={rg} />}
      </div>
    </div>
  );
}
