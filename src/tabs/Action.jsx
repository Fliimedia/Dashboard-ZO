import { useMemo, useState } from "react";
import { Card } from "../components/ui.jsx";

const KEY = "pos_action_state";

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function Action({ data }) {
  const { kpis, dims } = data;
  const [state, setState] = useState(loadState);

  // vervolgacties afgeleid van de cijfers, met stabiele id per actie
  const actions = useMemo(() => {
    const weakCh = [...dims.kanalen].sort((a, b) => a.e - b.e)[0];
    const topLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
    const topCa = [...dims.campagnes].sort((a, b) => b.c - a.c)[0];
    return [
      { id: "engagement", t: "Betrokkenheid " + (weakCh ? weakCh.n : "zwakste kanaal") + " verbeteren",
        d: "Dit kanaal heeft de laagste betrokkenheid (" + (weakCh ? weakCh.e : 0) + "%). Verbeter de aansluiting tussen instroom en landingspagina, en test een specifiekere boodschap." },
      { id: "landing", t: "Call to action versterken op " + (topLp ? topLp.n : "beste pagina"),
        d: "Deze landingspagina converteert het best. Zet er de belangrijkste call to action prominenter neer en test varianten van de kop." },
      { id: "campaign", t: "Best presterende campagne opschalen: " + (topCa ? topCa.n : "topcampagne"),
        d: "Deze campagne levert de meeste conversies. Onderzoek een hoger budget of een tweede doelgroep met dezelfde boodschap." },
      { id: "utm", t: "UTM-tagging controleren op alle campagnes",
        d: "Zorg dat elke campagne UTM-tags voert, zodat de campagne-tabel compleet en betrouwbaar blijft." },
      { id: "target", t: "Dagtarget verhogen zodra het twee weken wordt gehaald",
        d: "Conversies staan op " + (kpis.cur.c || 0) + " deze periode. Verhoog het dagtarget pas als het huidige target twee weken op rij wordt gehaald." },
    ];
  }, [dims, kpis]);

  function update(id, patch) {
    setState((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      saveState(next);
      return next;
    });
  }
  function setStatus(id, status) {
    const cur = state[id]?.status;
    update(id, { status: cur === status ? null : status });
  }
  function setVote(id, vote) {
    const cur = state[id]?.vote;
    update(id, { vote: cur === vote ? null : vote });
  }

  const open = actions.filter((a) => !state[a.id]?.status);
  const done = actions.filter((a) => state[a.id]?.status);

  return (
    <div className="view">
      <Card>
        <div className="h1 disp">Vervolgacties</div>
        <div className="h2">Keur acties goed of af en geef feedback, {open.length} open van {actions.length}</div>
        {actions.map((a) => {
          const st = state[a.id] || {};
          return (
            <div className={"action" + (st.status ? " " + st.status : "")} key={a.id}>
              <div className="atop">
                <div className="atitle">{a.t}</div>
                {st.status && <span className={"astatus " + st.status}>{st.status === "approved" ? "Goedgekeurd" : "Afgekeurd"}</span>}
              </div>
              <div className="adesc">{a.d}</div>
              <div className="arow">
                <button className={"abtn ok" + (st.status === "approved" ? " on" : "")} onClick={() => setStatus(a.id, "approved")}>
                  <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>Goedkeuren
                </button>
                <button className={"abtn no" + (st.status === "rejected" ? " on" : "")} onClick={() => setStatus(a.id, "rejected")}>
                  <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>Afkeuren
                </button>
                <div className="aspace" />
                <button className={"vote" + (st.vote === "up" ? " up" : "")} onClick={() => setVote(a.id, "up")} aria-label="Duim omhoog">
                  <svg viewBox="0 0 24 24"><path d="M7 11v9H3v-9zM7 11l4-8a2 2 0 013 2l-1 4h5a2 2 0 012 2l-2 7a2 2 0 01-2 1H7" /></svg>
                </button>
                <button className={"vote" + (st.vote === "down" ? " down" : "")} onClick={() => setVote(a.id, "down")} aria-label="Duim omlaag">
                  <svg viewBox="0 0 24 24"><path d="M17 13V4h4v9zM17 13l-4 8a2 2 0 01-3-2l1-4H6a2 2 0 01-2-2l2-7a2 2 0 012-1h9" /></svg>
                </button>
              </div>
            </div>
          );
        })}
        {done.length > 0 && (
          <div className="maphint" style={{ marginTop: 10 }}>
            {done.length} behandeld. Klik dezelfde knop opnieuw om terug te zetten naar open.
          </div>
        )}
      </Card>
    </div>
  );
}
