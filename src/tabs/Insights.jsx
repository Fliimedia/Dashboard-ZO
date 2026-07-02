import { useState } from "react";
import { Card, fmtInt, fmtPctDelta } from "../components/ui.jsx";

export default function Insights({ data }) {
  const { kpis, dims } = data;
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");

  const topCh = [...dims.kanalen].sort((a, b) => b.s - a.s)[0];
  const weakCh = [...dims.kanalen].sort((a, b) => a.e - b.e)[0];
  const topLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
  const delta = fmtPctDelta(kpis.cur.s, kpis.prev.s);

  async function generate() {
    setBusy(true); setReport("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: { kpis, dims } }),
      });
      if (!res.ok) throw new Error("api " + res.status);
      const out = await res.json();
      setReport(out.report || out.text || "Geen rapport ontvangen");
    } catch (e) {
      setReport("Rapportgeneratie is nog niet geconfigureerd op deze omgeving (ANTHROPIC_API_KEY). De cijfers hierboven staan klaar als input.");
    } finally { setBusy(false); }
  }

  return (
    <div className="view">
      <Card>
        <div className="h1 disp">Business insights</div>
        <div className="h2">Het verhaal van deze periode</div>
        <p style={{ fontSize: 13, lineHeight: 1.65, margin: "4px 0 0" }}>
          Het verkeer {delta >= 0 ? "steeg" : "daalde"} {Math.abs(delta)}% naar {fmtInt(kpis.cur.s)} sessies.
          {" "}{topCh?.n} is het sterkste kanaal, en {topLp?.n} levert de meeste conversies.
          {" "}Aandachtspunt is {weakCh?.n}, met de laagste betrokkenheid ({weakCh?.e}%).
        </p>
      </Card>

      <Card>
        <div className="h1 disp">Optimalisatielijst</div>
        <div className="h2">Concrete acties uit de cijfers</div>
        <div className="opt"><span className="mk" /><span>{weakCh?.n} blijft achter in betrokkenheid ({weakCh?.e}%). Verbeter de aansluiting tussen instroom en landingspagina.</span></div>
        <div className="opt"><span className="mk" /><span>{topLp?.n} converteert het best. Zet daar je belangrijkste call to action en test varianten.</span></div>
        <div className="opt"><span className="mk" /><span>Conversies groeiden naar {fmtInt(kpis.cur.c)}. Verhoog het dagtarget zodra het huidige target twee weken op rij wordt gehaald.</span></div>
        <div className="opt"><span className="mk" /><span>Controleer of alle campagnes UTM-tags voeren, zodat de campagne-tabel compleet is.</span></div>
      </Card>

      <Card>
        <div className="hrow">
          <div>
            <div className="h1 disp">Maandrapport</div>
            <div className="h2">Klantklaar rapport op basis van deze cijfers</div>
          </div>
          <button className="btn" onClick={generate} disabled={busy}>{busy ? "Bezig..." : "Genereer rapport"}</button>
        </div>
        {report && <p style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 10 }}>{report}</p>}
      </Card>
    </div>
  );
}
