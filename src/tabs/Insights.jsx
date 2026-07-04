import { useState } from "react";
import { Card, fmtInt, fmtPctDelta } from "../components/ui.jsx";
import { PERIOD_LABEL } from "../data.js";

const CTX_KEY = "pos_report_context";

export default function Insights({ data, period = "maand", compare = "prev" }) {
  const plabel = PERIOD_LABEL[period] || "deze periode";
  const cmp = compare === "yoy" ? "dezelfde periode vorig jaar" : "de periode ervoor";
  const { kpis, dims } = data;
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [ctx, setCtx] = useState(() => {
    try { return localStorage.getItem(CTX_KEY) || ""; } catch { return ""; }
  });
  const [save, setSave] = useState(() => {
    try { return !!localStorage.getItem(CTX_KEY); } catch { return false; }
  });

  function onCtx(v) {
    setCtx(v);
    try { if (save) localStorage.setItem(CTX_KEY, v); } catch {}
  }
  function onSave(v) {
    setSave(v);
    try { v ? localStorage.setItem(CTX_KEY, ctx) : localStorage.removeItem(CTX_KEY); } catch {}
  }

  async function generate() {
    setBusy(true); setReport("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: { kpis, dims }, context: ctx, period: plabel }),
      });
      if (!res.ok) throw new Error("api " + res.status);
      const out = await res.json();
      setReport(out.report || out.text || "Geen rapport ontvangen");
    } catch (e) {
      setReport("Rapportgeneratie is nog niet geconfigureerd op deze omgeving (ANTHROPIC_API_KEY). Je context en de cijfers staan klaar als input.");
    } finally { setBusy(false); }
  }

  // Business insights, afgestemd op context en op significante stijgingen/dalingen
  const bySessies = (arr) => [...arr].sort((a, b) => b.s - a.s);
  const searchCh = dims.kanalen.find((k) => /zoek|search|organisch/i.test(k.n)) || bySessies(dims.kanalen)[0];
  const socialCh = dims.kanalen.find((k) => /social/i.test(k.n)) || bySessies(dims.kanalen)[1] || searchCh;
  const sD = fmtPctDelta(kpis.cur.s, kpis.prev.s);
  const eD = fmtPctDelta(kpis.cur.e, kpis.prev.e);
  const cD = fmtPctDelta(kpis.cur.c, kpis.prev.c);
  const bigDim = bySessies(dims.kanalen)[0];
  const topConv = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
  const engFlat = Math.abs(eD) <= 3;

  return (
    <div className="view">
      <Card>
        <div className="h1 disp">Genereer rapport</div>
        <div className="h2">Realtime analyse over de {plabel}, verrijkt met je eigen input</div>
        <textarea className="rinput" placeholder="Eigen input, bijvoorbeeld: deze maand voeren we de Zomer campagne, let op de aanvraagpagina"
          value={ctx} onChange={(e) => onCtx(e.target.value)} />
        <label className="chk">
          <input type="checkbox" checked={save} onChange={(e) => onSave(e.target.checked)} />
          Input opslaan voor volgende rapporten
        </label>
        <button className="btn" onClick={generate} disabled={busy} style={{ marginTop: 12, alignSelf: "flex-start" }}>
          {busy ? "Bezig..." : "Genereer rapport"}
        </button>
        {report && <p style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 12 }}>{report}</p>}
      </Card>

      <Card>
        <div className="h1 disp">Business insights</div>
        <div className="h2">Het verhaal van de {plabel}</div>
        <p style={{ fontSize: 13, lineHeight: 1.7, margin: "4px 0 0" }}>
          {ctx.trim() && <><b>{ctx.trim()}.</b>{" "}</>}
          In de {plabel} kwamen er {fmtInt(searchCh.u)} bezoekers uit {searchCh.n.toLowerCase()} en {fmtInt(socialCh.u)} uit {socialCh.n.toLowerCase()} binnen, met {fmtInt(kpis.cur.c)} conversies totaal.
          {" "}Op de website zagen we deze periode {Math.abs(sD)}% {sD >= 0 ? "meer" : "minder"} sessies tegenover {cmp}; de {sD >= 0 ? "grootste stijging" : "grootste daling"} in bezoekers was zichtbaar bij {bigDim.n}.
          {" "}De engagement rate {engFlat ? "bleef ongeveer gelijk" : eD >= 0 ? "steeg" : "daalde"} ({eD >= 0 ? "+" : ""}{eD}%).
          {" "}In aanmeldingen was er een {cD >= 0 ? "toename" : "afname"} van {Math.abs(cD)}%, waarvan het grootste deel afkomstig was uit {topConv.n}.
        </p>
      </Card>
    </div>
  );
}
