import { useMemo, useState } from "react";
import { Card } from "../components/ui.jsx";
import { useUI, useT } from "../i18n.js";

const KEY = "pos_action_state";

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function Action({ data, period = "maand" }) {
  const { lang } = useUI();
  const t = useT();
  const L = (nl, en) => (lang === "en" ? en : nl);
  const plabel = t("p_" + ({ jaar: "year", kwartaal: "quarter", maand: "month", week: "week" }[period] || "month"));
  const { kpis, dims } = data;
  const [state, setState] = useState(loadState);
  const [flt, setFlt] = useState("alle");

  // vervolgacties afgeleid van de cijfers, met stabiele id per actie
  const actions = useMemo(() => {
    const weakCh = [...dims.kanalen].sort((a, b) => a.e - b.e)[0];
    const topLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
    const topCa = [...dims.campagnes].sort((a, b) => b.c - a.c)[0];
    return [
      { id: "engagement", prio: "middel", t: L("Betrokkenheid " + (weakCh ? weakCh.n : "zwakste kanaal") + " verbeteren", "Improve engagement of " + (weakCh ? weakCh.n : "the weakest channel")),
        d: L("Dit kanaal heeft de laagste betrokkenheid (" + (weakCh ? weakCh.e : 0) + "%). Verbeter de aansluiting tussen instroom en landingspagina, en test een specifiekere boodschap.", "This channel has the lowest engagement (" + (weakCh ? weakCh.e : 0) + "%). Improve the match between inflow and landing page, and test a more specific message.") },
      { id: "landing", prio: "hoog", t: L("Call to action versterken op " + (topLp ? topLp.n : "beste pagina"), "Strengthen the call to action on " + (topLp ? topLp.n : "the best page")),
        d: L("Deze landingspagina converteert het best. Zet er de belangrijkste call to action prominenter neer en test varianten van de kop.", "This landing page converts best. Make the main call to action more prominent and test headline variants.") },
      { id: "campaign", prio: "hoog", t: L("Best presterende campagne opschalen: " + (topCa ? topCa.n : "topcampagne"), "Scale the best performing campaign: " + (topCa ? topCa.n : "top campaign")),
        d: L("Deze campagne levert de meeste conversies. Onderzoek een hoger budget of een tweede doelgroep met dezelfde boodschap.", "This campaign delivers the most conversions. Consider a higher budget or a second audience with the same message.") },
      { id: "utm", prio: "laag", t: L("UTM-tagging controleren op alle campagnes", "Check UTM tagging on all campaigns"),
        d: L("Zorg dat elke campagne UTM-tags voert, zodat de campagne-tabel compleet en betrouwbaar blijft.", "Make sure every campaign carries UTM tags so the campaign table stays complete and reliable.") },
      { id: "target", prio: "middel", t: L("Dagtarget verhogen zodra het twee weken wordt gehaald", "Raise the daily target once it is met for two weeks"),
        d: L("Conversies staan op " + (kpis.cur.c || 0) + " in de periode. Verhoog het dagtarget pas als het huidige target twee weken op rij wordt gehaald.", "Conversions are at " + (kpis.cur.c || 0) + " in the period. Only raise the daily target once the current one is met two weeks in a row.") },
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
        <div className="h1 disp">{t("followups")}</div>
        <div className="h2">{t("from_figures")} {plabel}, {open.length} {t("open_of")} {actions.length}</div>
        <div className="aprog"><i style={{ width: Math.round((done.length / actions.length) * 100) + "%" }} /></div>
        <div className="afilters">
          {[["alle", t("all")], ["open", t("open")], ["approved", t("approved")], ["rejected", t("rejected")]].map(([k, l]) => (
            <button key={k} className={"fchip" + (flt === k ? " on" : "")} onClick={() => setFlt(k)}>{l}</button>
          ))}
        </div>
        {actions
          .filter((a) => flt === "alle" ? true : flt === "open" ? !state[a.id]?.status : state[a.id]?.status === flt)
          .sort((a, b) => ({ hoog: 0, middel: 1, laag: 2 }[a.prio] - { hoog: 0, middel: 1, laag: 2 }[b.prio]))
          .map((a) => {
          const st = state[a.id] || {};
          return (
            <div className={"action" + (st.status ? " " + st.status : "")} key={a.id}>
              <div className="atop">
                <span className={"prio " + a.prio}>{a.prio === "hoog" ? t("priority_high") : a.prio === "middel" ? t("priority_mid") : t("priority_low")}</span>
                <div className="atitle">{a.t}</div>
                {st.status && <span className={"astatus " + st.status}>{st.status === "approved" ? t("approved") : t("rejected")}</span>}
              </div>
              <div className="adesc">{a.d}</div>
              <div className="arow">
                <button className={"abtn ok" + (st.status === "approved" ? " on" : "")} onClick={() => setStatus(a.id, "approved")}>
                  <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>{t("approve")}
                </button>
                <button className={"abtn no" + (st.status === "rejected" ? " on" : "")} onClick={() => setStatus(a.id, "rejected")}>
                  <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>{t("reject")}
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
            {done.length} {L("behandeld. Klik dezelfde knop opnieuw om terug te zetten naar open.", "handled. Click the same button again to reset to open.")}
          </div>
        )}
      </Card>
    </div>
  );
}
