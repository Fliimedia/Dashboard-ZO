import React, { useState, useMemo } from "react";
import { Card } from "../components/ui.jsx";
import { int, pct, dur, delta, optimizations } from "../data";

export default function Insights({ d, client, rg }) {
  const [status, setStatus] = useState("idle");
  const [report, setReport] = useState("");
  const [noKey, setNoKey] = useState(false);
  const opts = useMemo(() => optimizations(d), [d]);

  function facts() {
    const top = d.channels.slice(0, 5).map((c) => c.name + ": " + int(c.sessions) + " sessies").join("; ");
    const half = Math.floor(d.trend.length / 2), sum = (a) => a.reduce((x, y) => x + y.sessions, 0);
    const dir = sum(d.trend.slice(half)) > sum(d.trend.slice(0, half)) ? "stijgend" : sum(d.trend.slice(half)) < sum(d.trend.slice(0, half)) ? "dalend" : "vlak";
    return "Periode: " + rg.cur.startDate + " tot " + rg.cur.endDate + ". Sessies: " + int(d.cur.sessions) + " (vorige periode " + int(d.prev.sessions) + "). Gebruikers: " + int(d.cur.users) + ", waarvan nieuw " + int(d.cur.newUsers) + ". Paginaweergaven: " + int(d.cur.views) + ". Gemiddelde sessieduur: " + dur(d.cur.avgDur) + ". Betrokkenheid: " + pct(d.cur.engRate) + ". Bounce rate: " + pct(d.cur.bounceRate) + ". Top kanalen: " + (top || "geen") + ". Trend sessies: " + dir + ".";
  }

  async function writeReport() {
    setStatus("loading"); setReport(""); setNoKey(false);
    try {
      const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: facts(), type: "Maandrapport", client: client.name }) });
      const j = await res.json();
      if (j.ok === false && j.reason === "no_key") { setNoKey(true); setStatus("done"); return; }
      if (j.ok === false) throw new Error(j.error || "API fout");
      setReport(j.text || ""); setStatus("done");
    } catch (e) { setReport("Kon het rapport niet schrijven: " + (e.message || "")); setStatus("done"); }
  }

  return (
    <div>
      <Card title="Business insights">
        <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
          In deze periode {d.cur.sessions >= d.prev.sessions ? "steeg" : "daalde"} het verkeer naar {int(d.cur.sessions)} sessies
          ({delta(d.cur.sessions, d.prev.sessions).t || "geen vergelijking"} tegenover de vorige periode).
          Het grootste kanaal is {d.channels[0] ? d.channels[0].name : "onbekend"}.
          De betrokkenheid ligt op {pct(d.cur.engRate)}.
        </p>
      </Card>

      <Card title="Optimalisatielijst" style={{ marginTop: 14 }}>
        {opts.map((o, i) => <div className="opt" key={i}><span className="mk" /><span style={{ fontSize: 14, lineHeight: 1.5 }}>{o}</span></div>)}
      </Card>

      <Card title="Maandrapport" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: -34, marginBottom: 12 }}>
          {report && <button className="btn ghost" onClick={() => navigator.clipboard.writeText(report)}>Kopieer</button>}
          <button className="btn" onClick={writeReport} disabled={status === "loading"}>{status === "loading" ? "Schrijven..." : "Genereer rapport"}</button>
        </div>
        {noKey && <div className="note">Het schrijven staat uit. Zet de env var ANTHROPIC_API_KEY in Vercel om automatische rapporten aan te zetten. De cijfers en de optimalisatielijst werken sowieso.</div>}
        {report && <div className="pre">{report}</div>}
        {!report && !noKey && status !== "loading" && <p style={{ fontSize: 13.5, color: "var(--mist)", margin: 0 }}>Klik op genereren voor een geschreven rapport op basis van bovenstaande cijfers.</p>}
      </Card>
    </div>
  );
}
