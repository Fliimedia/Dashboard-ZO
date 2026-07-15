import { useState } from "react";
import { Card, fmtInt, fmtPctDelta } from "../components/ui.jsx";
import { PERIOD_LABEL } from "../data.js";

const CTX_KEY = "pos_report_context";

export default function Insights({ data, period = "maand", compare = "prev" }) {
  const plabel = PERIOD_LABEL[period] || "deze periode";
  const cmp = compare === "yoy" ? "dezelfde periode vorig jaar" : "de periode ervoor";
  const { kpis, dims } = data;
  const delta = fmtPctDelta(kpis.cur.s, kpis.prev.s);
  const cdelta = fmtPctDelta(kpis.cur.c, kpis.prev.c);
  const weakCh = [...dims.kanalen].sort((a, b) => a.e - b.e)[0];
  const topLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
  const topCa = [...dims.campagnes].sort((a, b) => b.c - a.c)[0];
  const rate = kpis.cur.s ? Math.round((kpis.cur.c / kpis.cur.s) * 1000) / 10 : 0;
  const insights = [
    { imp: Math.abs(delta) > 15 ? "hoog" : "middel", m: (delta >= 0 ? "+" : "") + delta + "%",
      t: "Verkeer " + (delta >= 0 ? "groeit" : "krimpt") + " tegenover " + cmp,
      d: "Het verkeer " + (delta >= 0 ? "steeg" : "daalde") + " in de " + plabel + " met " + Math.abs(delta) + "% naar " + fmtInt(kpis.cur.s) + " sessies. Conversies " + (cdelta >= 0 ? "stegen" : "daalden") + " " + Math.abs(cdelta) + "%." },
    { imp: rate < 3 ? "hoog" : "middel", m: String(rate).replace(".", ",") + "%",
      t: "Conversieratio van sessie naar aanmelding",
      d: "Van elke duizend sessies leiden er " + Math.round(rate * 10) + " tot een aanmelding. " + (rate < 3 ? "Onder de 3% is er ruimte in het aanvraagpad." : "Dat is een gezond niveau; bewaken bij schalen.") },
    { imp: "hoog", m: fmtInt(topCa?.c || 0),
      t: "Campagne " + (topCa?.n || "") + " draagt het meest bij",
      d: "Deze campagne levert de meeste conversies. Opschalen is de snelste route naar groei binnen het huidige budget." },
    { imp: "middel", m: (weakCh?.e || 0) + "%",
      t: (weakCh?.n || "Zwakste kanaal") + " blijft achter in betrokkenheid",
      d: "De aansluiting tussen deze instroom en de landingspagina is het verbeterpunt; " + (topLp?.n || "de beste pagina") + " laat zien wat wel werkt." },
  ];
  function copyReport() {
    const txt = "Business insights, " + plabel + "\n\n" + insights.map((i) => "[" + i.imp + "] " + i.t + "\n" + i.d).join("\n\n");
    try { navigator.clipboard.writeText(txt); } catch {}
  }
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [ctx, setCtx] = useState(() => {
    try { return localStorage.getItem(CTX_KEY) || ""; } catch { return ""; }
  });
  const [save, setSave] = useState(() => {
    try { return !!localStorage.getItem(CTX_KEY); } catch { return false; }
  });

  const topCh = [...dims.kanalen].sort((a, b) => b.s - a.s)[0];

  function onCtx(v) {
    setCtx(v);
    try { if (save) localStorage.setItem(CTX_KEY, v); } catch {}
  }
  function onSave(v) {
    setSave(v);
    try { v ? localStorage.setItem(CTX_KEY, ctx) : localStorage.removeItem(CTX_KEY); } catch {}
  }

  // Bouw een compleet rapport lokaal uit de echte cijfers. Geen invoer vereist.
  function buildReport() {
    const topCh = [...dims.kanalen].sort((a, b) => b.s - a.s)[0];
    const topCa2 = [...dims.campagnes].sort((a, b) => b.c - a.c)[0];
    const bestLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
    const P = [];
    P.push("Rapport, " + plabel + ".");
    P.push("");
    P.push("Kerncijfers. In de " + plabel + " waren er " + fmtInt(kpis.cur.s) + " sessies van " + fmtInt(kpis.cur.u) + " gebruikers, met " + fmtInt(kpis.cur.c) + " conversies. Dat is een conversieratio van " + String(rate).replace(".", ",") + "%. Het verkeer " + (delta >= 0 ? "steeg" : "daalde") + " " + Math.abs(delta) + "% tegenover " + cmp + ", conversies " + (cdelta >= 0 ? "stegen" : "daalden") + " " + Math.abs(cdelta) + "%.");
    P.push("");
    P.push("Kanalen. " + (topCh ? topCh.n + " leverde het meeste verkeer met " + fmtInt(topCh.s) + " sessies." : "") + (topCa2 ? " De campagne " + topCa2.n + " droeg het meest bij aan conversies (" + fmtInt(topCa2.c) + ")." : ""));
    P.push("");
    P.push("Pagina's. " + (bestLp ? bestLp.n + " converteert het best en verdient de meeste aandacht in optimalisatie." : "") + (weakCh ? " Het kanaal " + weakCh.n + " blijft achter in betrokkenheid (" + weakCh.e + "%) en is het duidelijkste verbeterpunt." : ""));
    P.push("");
    P.push("Aanbevelingen.");
    P.push("1. Schaal " + (topCa2 ? topCa2.n : "de best presterende campagne") + " op, dit is de snelste route naar groei binnen het budget.");
    P.push("2. Versterk de call to action op " + (bestLp ? bestLp.n : "de best converterende pagina") + " en test varianten van de kop.");
    P.push("3. Verbeter de aansluiting tussen " + (weakCh ? weakCh.n : "het zwakste kanaal") + " en de landingspagina om betrokkenheid te verhogen.");
    if (ctx && ctx.trim()) { P.push(""); P.push("Context van het team. " + ctx.trim()); }
    return P.join("\n");
  }

  async function generate() {
    setBusy(true); setReport("");
    const local = buildReport();
    try {
      // Optionele verrijking via de server, alleen als het endpoint een sleutel heeft
      const facts = "Periode: " + plabel + ". Sessies " + kpis.cur.s + ", gebruikers " + kpis.cur.u + ", conversies " + kpis.cur.c + ", conversiewaarde " + kpis.cur.w + ", conversieratio " + rate + "%. " +
        "Top kanalen: " + dims.kanalen.slice(0, 5).map((k) => k.n + " " + k.s + " sessies " + k.c + " conv").join("; ") + ". " +
        (ctx ? "Context: " + ctx : "");
      const res = await fetch("/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, type: "Performance rapport", client: "Flii Media" }),
      });
      if (res.ok) {
        const out = await res.json();
        if (out && out.ok !== false && (out.report || out.text)) { setReport(out.report || out.text); setBusy(false); return; }
      }
    } catch (e) { /* val terug op lokaal */ }
    setReport(local);
    setBusy(false);
  }

  return (
    <div className="view">
      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Genereer rapport</div>
            <div className="h2">Kant en klaar rapport uit de cijfers van de {plabel}</div>
          </div>
          <button className="btn" style={{ marginBottom: 14 }} onClick={generate} disabled={busy}>{busy ? "Bezig..." : "Genereer rapport"}</button>
        </div>
        <textarea className="rinput" placeholder="Optioneel: context of focuspunten. Het rapport wordt uit de cijfers zelf opgebouwd."
          value={ctx} onChange={(e) => onCtx(e.target.value)} />
        <label className="chk">
          <input type="checkbox" checked={save} onChange={(e) => onSave(e.target.checked)} />
          Input opslaan voor volgende rapporten
        </label>
        {report && (
          <div className="reportout">
            <div className="hrow" style={{ marginBottom: 6 }}>
              <div className="h2">Rapport</div>
              <button className="btn ghost" onClick={() => { try { navigator.clipboard.writeText(report); } catch {} }}>Kopieer</button>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{report}</p>
          </div>
        )}
      </Card>

      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Business insights</div>
            <div className="h2">Het verhaal van de {plabel}</div>
          </div>
          <button className="btn ghost" onClick={copyReport}>Kopieer</button>
        </div>
        <div className="inscards">
          {insights.map((it, i) => (
            <div className="inscard" key={i}>
              <div className="instop">
                <span className={"imp " + it.imp}>{it.imp === "hoog" ? "Hoge impact" : it.imp === "middel" ? "Middel" : "Laag"}</span>
                <span className="insm mono">{it.m}</span>
              </div>
              <div className="inst">{it.t}</div>
              <div className="insd">{it.d}</div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
