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

  const topCh = [...dims.kanalen].sort((a, b) => b.s - a.s)[0];
  const weakCh = [...dims.kanalen].sort((a, b) => a.e - b.e)[0];
  const topLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
  const delta = fmtPctDelta(kpis.cur.s, kpis.prev.s);

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

  return (
    <div className="view">
      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Genereer rapport</div>
            <div className="h2">Realtime analyse over de {plabel}</div>
          </div>
          <button className="btn" style={{ marginBottom: 14 }} onClick={generate} disabled={busy}>{busy ? "Bezig..." : "Genereer rapport"}</button>
        </div>
        <textarea className="rinput" placeholder="Eigen input, zoals context of focuspunten voor de analyse"
          value={ctx} onChange={(e) => onCtx(e.target.value)} />
        <label className="chk">
          <input type="checkbox" checked={save} onChange={(e) => onSave(e.target.checked)} />
          Input opslaan voor volgende rapporten
        </label>
        {report && <p style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 10 }}>{report}</p>}
      </Card>

      <Card>
        <div className="h1 disp">Business insights</div>
        <div className="h2">Het verhaal van de {plabel}</div>
        <p style={{ fontSize: 13, lineHeight: 1.65, margin: "4px 0 0" }}>
          Het verkeer {delta >= 0 ? "steeg" : "daalde"} in de {plabel} met {Math.abs(delta)}% naar {fmtInt(kpis.cur.s)} sessies, tegenover {cmp}.
          {" "}{topCh?.n} is het sterkste kanaal, en {topLp?.n} levert de meeste conversies.
          {" "}Aandachtspunt is {weakCh?.n}, met de laagste betrokkenheid ({weakCh?.e}%).
        </p>
      </Card>

    </div>
  );
}
