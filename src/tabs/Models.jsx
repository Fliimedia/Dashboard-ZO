import React, { useState, useEffect } from "react";
import Chart from "../components/Chart.jsx";
import { Card } from "../components/ui.jsx";
import { int, forecast } from "../data";
import { forecastLine } from "../charts";

export default function Models({ d, days }) {
  const [target, setTarget] = useState(() => { const v = localStorage.getItem("pos_target_sessions"); return v ? Number(v) : 0; });
  useEffect(() => { localStorage.setItem("pos_target_sessions", String(target)); }, [target]);

  const f = forecast(d.trend, days);
  const pace = target ? Math.min(999, (d.cur.sessions / target) * 100) : 0;

  return (
    <div>
      <div className="grid g3">
        <div className="card sc"><div className="lab">Sessies deze periode</div><div className="val">{int(d.cur.sessions)}</div><div className="delta flat">{days} dagen</div></div>
        <div className="card sc"><div className="lab">Prognose volgende periode</div><div className="val">{f ? int(f.proj) : "-"}</div><div className={"delta " + (f && f.dir === "stijgend" ? "up" : f && f.dir === "dalend" ? "down" : "flat")}>{f ? f.dir : "te weinig data"}</div></div>
        <div className="card sc"><div className="lab">Voortgang naar target</div><div className="val">{target ? Math.round(pace) + "%" : "-"}</div><div className="delta flat">{target ? int(d.cur.sessions) + " van " + int(target) : "stel een target in"}</div></div>
      </div>

      <Card title="Target instellen" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="field"><label>Doel sessies (periode)</label><input type="number" value={target || ""} onChange={(e) => setTarget(Number(e.target.value) || 0)} placeholder="bijv. 5000" /></div>
          {target > 0 && <div style={{ flex: 1, minWidth: 180 }}><div className="bar"><span className="bl">Voortgang</span><span className="bt"><span className="bf" style={{ width: Math.min(100, pace) + "%" }} /></span><span className="bv">{Math.round(pace)}%</span></div></div>}
        </div>
      </Card>

      <Card title="Sessies met prognoselijn" style={{ marginTop: 14 }}>
        {f ? <Chart option={forecastLine(d.trend, f.series)} height={250} /> : <div className="note">Te weinig dagen om een prognose te tekenen.</div>}
        <p style={{ fontSize: 12.5, color: "var(--mist)", marginTop: 8 }}>De prognose is een lineaire projectie op basis van het dagelijkse verloop in deze periode. Bedoeld als richting, niet als garantie.</p>
      </Card>
    </div>
  );
}
