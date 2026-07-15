import { useState } from "react";
import { Card, fmtInt, fmtPctDelta } from "../components/ui.jsx";
import { PERIOD_LABEL, KEYWORDS, BRAND } from "../data.js";

const CTX_KEY = "pos_report_context";

function ReportView({ r }) {
  if (r && r.text) return <p className="rp-prose">{r.text}</p>;
  if (!r) return null;
  return (
    <div className="rp">
      <div className="rp-head">
        <div className="rp-title disp">{r.title}</div>
        <div className="rp-sub">{r.sub}</div>
      </div>
      <div className="rp-kpis">
        {r.kpis.map((k) => (
          <div className="rp-kpi" key={k.l}>
            <div className="rp-kl">{k.l}</div>
            <div className="rp-kv disp">{k.v}</div>
            {k.d != null && <div className={"rp-kd " + (k.d >= 0 ? "up" : "down")}>{k.d >= 0 ? "+" : ""}{k.d}%</div>}
          </div>
        ))}
      </div>
      <p className="rp-prose">{r.intro}</p>
      {r.tables.map((t) => (
        <div className="rp-block" key={t.title}>
          <div className="rp-h">{t.title}</div>
          <table className="rp-table">
            <thead><tr>{t.cols.map((c, i) => <th key={c} className={i ? "num" : ""}>{c}</th>)}</tr></thead>
            <tbody>{t.rows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} className={ci ? "num mono" : ""}>{cell}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <div className="rp-block">
        <div className="rp-h">Aanbevelingen</div>
        <ol className="rp-recs">{r.recs.map((x, i) => <li key={i}>{x}</li>)}</ol>
      </div>
      {r.context && (
        <div className="rp-block">
          <div className="rp-h">Context van het team</div>
          <p className="rp-prose">{r.context}</p>
        </div>
      )}
    </div>
  );
}

export default function Insights({ data, period = "maand", compare = "prev" }) {
  const plabel = PERIOD_LABEL[period] || "deze periode";
  const cmp = compare === "yoy" ? "dezelfde periode vorig jaar" : "de periode ervoor";
  const { kpis, dims } = data;
  const delta = fmtPctDelta(kpis.cur.s, kpis.prev.s);
  const cdelta = fmtPctDelta(kpis.cur.c, kpis.prev.c);
  const rate = kpis.cur.s ? Math.round((kpis.cur.c / kpis.cur.s) * 1000) / 10 : 0;

  // Iconen per inzichttype
  const IC = {
    trend: <svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-7" /><path d="M17 8h4v4" /></svg>,
    funnel: <svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-4z" /></svg>,
    channel: <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
    search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>,
    social: <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 018-8" /><path d="M4 20a16 16 0 0116-16" /><circle cx="5" cy="19" r="1.6" /></svg>,
    page: <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>,
    pulse: <svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>,
    money: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5a2.5 2 0 015 0c0 2.5-5 1.5-5 4a2.5 2 0 005 0" /></svg>,
  };

  // Afgeleiden uit de dimensies
  const convRate = (r) => (r.s ? (r.c / r.s) * 100 : 0);
  const byVolume = [...dims.kanalen].sort((a, b) => b.s - a.s);
  const bigCh = byVolume[0];
  const effCh = [...dims.kanalen].filter((c) => c.s >= 300).sort((a, b) => convRate(b) - convRate(a))[0];
  const weakCh = [...dims.kanalen].sort((a, b) => a.e - b.e)[0];
  const topLp = [...dims.landingspaginas].sort((a, b) => b.c - a.c)[0];
  const deadLp = [...dims.landingspaginas].filter((p) => p.s >= 400).sort((a, b) => convRate(a) - convRate(b))[0];

  // Campagnes classificeren op naam: search, social, e-mail, overig
  const classify = (n) => {
    const s = n.toLowerCase();
    if (/(search|sea|google|zoek|brand|merk)/.test(s)) return "search";
    if (/(social|meta|facebook|insta|linkedin|retarget|display)/.test(s)) return "social";
    if (/(mail|nieuwsbrief|email|crm)/.test(s)) return "email";
    return "overig";
  };
  const camps = dims.campagnes.map((c) => ({ ...c, type: classify(c.n) }));
  const topSearch = camps.filter((c) => c.type === "search").sort((a, b) => b.c - a.c)[0];
  const topSocial = camps.filter((c) => c.type === "social").sort((a, b) => b.c - a.c)[0];

  // Zoekwoorden: snelste stijger, gekoppeld aan het search-kanaal
  const searchCh = dims.kanalen.find((c) => /search/i.test(c.n));
  const riser = KEYWORDS && KEYWORDS.length ? [...KEYWORDS].sort((a, b) => b.c - a.c)[0] : null;

  // Bouw kandidaat-inzichten, elk datagedreven, en kies de sterkste
  const cand = [];

  cand.push({
    ic: IC.trend, imp: Math.abs(delta) > 15 ? "hoog" : "middel", m: (delta >= 0 ? "+" : "") + delta + "%",
    t: "Verkeer " + (delta >= 0 ? "groeit" : "krimpt") + " tegenover " + cmp,
    d: "Het verkeer " + (delta >= 0 ? "steeg" : "daalde") + " in de " + plabel + " met " + Math.abs(delta) + "% naar " + fmtInt(kpis.cur.s) + " sessies. Conversies " + (cdelta >= 0 ? "stegen" : "daalden") + " " + Math.abs(cdelta) + "%.",
    score: Math.abs(delta) });

  if (bigCh && effCh && bigCh.n !== effCh.n) {
    cand.push({
      ic: IC.channel, imp: "hoog", m: convRate(effCh).toFixed(1).replace(".", ",") + "%",
      t: effCh.n + " converteert het scherpst, " + bigCh.n + " brengt het meeste volume",
      d: bigCh.n + " levert de meeste sessies (" + fmtInt(bigCh.s) + ") maar converteert op " + convRate(bigCh).toFixed(1).replace(".", ",") + "%, terwijl " + effCh.n + " op " + convRate(effCh).toFixed(1).replace(".", ",") + "% zit. Meer budget of aandacht naar " + effCh.n + " haalt meer uit hetzelfde verkeer.",
      score: (convRate(effCh) - convRate(bigCh)) * 6 });
  }

  if (topSearch) {
    cand.push({
      ic: IC.search, imp: "hoog", m: fmtInt(topSearch.c),
      t: "Search-campagne " + topSearch.n + " is je sterkste betaalde bron",
      d: "Deze search-campagne leverde " + fmtInt(topSearch.c) + " conversies tegen " + convRate(topSearch).toFixed(1).replace(".", ",") + "% conversie. " + (riser && searchCh ? "De zoekvraag naar \"" + riser.k + "\" groeit " + (riser.c >= 0 ? "+" : "") + riser.c + "%, dus hier is ruimte om op te schalen." : "Overweeg het budget te verhogen zolang de conversie op peil blijft."),
      score: topSearch.c });
  }

  if (topSocial) {
    cand.push({
      ic: IC.social, imp: "middel", m: fmtInt(topSocial.c),
      t: "Social-campagne " + topSocial.n + " draagt bij aan de funnel",
      d: "Deze social-campagne bracht " + fmtInt(topSocial.s) + " sessies en " + fmtInt(topSocial.c) + " conversies. Social presteert doorgaans hoger in de oriëntatiefase; koppel hem aan retargeting om de conversie te verzilveren.",
      score: topSocial.c * 0.7 });
  }

  if (searchCh && riser) {
    cand.push({
      ic: IC.search, imp: riser.c > 25 ? "hoog" : "middel", m: (riser.c >= 0 ? "+" : "") + riser.c + "%",
      t: "Belangrijkste zoekwoord voor " + searchCh.n + ": " + riser.k,
      d: "De zoekvraag naar \"" + riser.k + "\" " + (riser.c >= 0 ? "stijgt" : "daalt") + " met " + Math.abs(riser.c) + "%. " + searchCh.n + " is je grootste organische kanaal; een landingspagina of blog die exact op deze term inspeelt, vangt die groeiende vraag.",
      score: Math.abs(riser.c) * 1.5 });
  }

  if (topLp) {
    cand.push({
      ic: IC.page, imp: "middel", m: fmtInt(topLp.c),
      t: "Belangrijkste landingspagina: " + topLp.n,
      d: topLp.n + " vangt de meeste conversies (" + fmtInt(topLp.c) + ") op " + convRate(topLp).toFixed(1).replace(".", ",") + "%. Zet hier je sterkste call to action en gebruik de pagina als sjabloon voor de andere.",
      score: topLp.c * 0.5 });
  }

  if (deadLp && convRate(deadLp) < 2) {
    cand.push({
      ic: IC.page, imp: "middel", m: convRate(deadLp).toFixed(1).replace(".", ",") + "%",
      t: deadLp.n + " trekt verkeer maar converteert nauwelijks",
      d: deadLp.n + " krijgt " + fmtInt(deadLp.s) + " sessies maar zet ze amper om (" + convRate(deadLp).toFixed(1).replace(".", ",") + "%). Een duidelijk vervolgpad of call to action richting " + (topLp ? topLp.n : "de aanvraagpagina") + " kan hier conversies vrijmaken.",
      score: deadLp.s / 200 });
  }

  cand.push({
    ic: IC.pulse, imp: "laag", m: (weakCh ? weakCh.e : 0) + "%",
    t: (weakCh ? weakCh.n : "Zwakste kanaal") + " blijft achter in betrokkenheid",
    d: "De aansluiting tussen deze instroom en de landingspagina is het verbeterpunt; " + (topLp ? topLp.n : "de beste pagina") + " laat zien wat wel werkt.",
    score: 4 });

  cand.push({
    ic: IC.funnel, imp: rate < 3 ? "hoog" : "middel", m: String(rate).replace(".", ",") + "%",
    t: "Conversieratio van sessie naar aanmelding",
    d: "Van elke duizend sessies leiden er " + Math.round(rate * 10) + " tot een aanmelding. " + (rate < 3 ? "Onder de 3% is er ruimte in het aanvraagpad." : "Dat is een gezond niveau; bewaken bij schalen."),
    score: rate < 3 ? 20 : 5 });

  // Trends: belangrijkste zoekwoord plus grootste stijger en daler in zoekvraag, met context
  if (KEYWORDS && KEYWORDS.length) {
    const topKw = [...KEYWORDS].sort((a, b) => b.v - a.v)[0];
    const upKw = [...KEYWORDS].sort((a, b) => b.c - a.c)[0];
    const downKw = [...KEYWORDS].sort((a, b) => a.c - b.c)[0];
    if (topKw) cand.push({
      ic: IC.search, imp: "middel", m: fmtInt(topKw.v),
      t: "Grootste zoekvraag: " + topKw.k,
      d: "Met " + fmtInt(topKw.v) + " zoekopdrachten per maand is dit de belangrijkste term in de categorie. Zorg dat een sterke landingspagina exact op deze intentie inspeelt.",
      score: 14 });
    if (upKw && upKw.c > 0) cand.push({
      ic: IC.trend, imp: upKw.c > 25 ? "hoog" : "middel", m: "+" + upKw.c + "%",
      t: "Sterkste stijger in zoekvraag: " + upKw.k,
      d: "De vraag naar \"" + upKw.k + "\" groeit " + upKw.c + "%, waarschijnlijk seizoensgebonden of door een nieuwstrend. Speel hierop in met content voordat concurrenten de term claimen.",
      score: 16 + upKw.c / 5 });
    if (downKw && downKw.c < 0) cand.push({
      ic: IC.trend, imp: "laag", m: downKw.c + "%",
      t: "Sterkste daler in zoekvraag: " + downKw.k,
      d: "De vraag naar \"" + downKw.k + "\" koelt af met " + Math.abs(downKw.c) + "%, mogelijk na een piek of door verschuivend gedrag. Verlaag hier de nadruk en verschuif budget naar stijgende termen.",
      score: 8 });
  }

  // Sorteer op relevantie en toon de sterkste zes
  const insights = cand.sort((a, b) => b.score - a.score).slice(0, 8);

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
    const topChannels = [...dims.kanalen].sort((a, b) => b.s - a.s).slice(0, 5);
    const topCamps = [...dims.campagnes].sort((a, b) => b.c - a.c).slice(0, 4);
    const topPages = [...dims.landingspaginas].sort((a, b) => b.c - a.c).slice(0, 5);
    const topCa2 = topCamps[0], bestLp = topPages[0], topCh = topChannels[0];
    const now = new Date();
    const dstr = now.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
    return {
      title: "Performance rapport",
      sub: BRAND.name + " / " + plabel + " / opgesteld " + dstr,
      kpis: [
        { l: "Sessies", v: fmtInt(kpis.cur.s), d: delta },
        { l: "Gebruikers", v: fmtInt(kpis.cur.u), d: fmtPctDelta(kpis.cur.u, kpis.prev.u) },
        { l: "Conversies", v: fmtInt(kpis.cur.c), d: cdelta },
        { l: "Conversieratio", v: String(rate).replace(".", ",") + "%", d: null },
      ],
      intro: "In de " + plabel + " trok de site " + fmtInt(kpis.cur.s) + " sessies van " + fmtInt(kpis.cur.u) +
        " gebruikers, met " + fmtInt(kpis.cur.c) + " conversies. Het verkeer " + (delta >= 0 ? "steeg" : "daalde") +
        " " + Math.abs(delta) + "% tegenover " + cmp + " en conversies " + (cdelta >= 0 ? "stegen" : "daalden") +
        " " + Math.abs(cdelta) + "%.",
      tables: [
        { title: "Kanalen", cols: ["Kanaal", "Sessies", "Conversies"], rows: topChannels.map((r) => [r.n, fmtInt(r.s), fmtInt(r.c)]) },
        { title: "Campagnes", cols: ["Campagne", "Conversies", "Waarde"], rows: topCamps.map((r) => [r.n, fmtInt(r.c), "\u20ac" + fmtInt(r.w)]) },
        { title: "Landingspagina's", cols: ["Pagina", "Sessies", "Conversies"], rows: topPages.map((r) => [r.n, fmtInt(r.s), fmtInt(r.c)]) },
      ],
      recs: [
        "Schaal " + (topCa2 ? topCa2.n : "de best presterende campagne") + " op; dit is de snelste route naar groei binnen het budget.",
        "Versterk de call to action op " + (bestLp ? bestLp.n : "de best converterende pagina") + " en test varianten van de kop.",
        "Verbeter de aansluiting tussen " + (weakCh ? weakCh.n : "het zwakste kanaal") + " en de landingspagina om betrokkenheid te verhogen.",
      ],
      context: ctx && ctx.trim() ? ctx.trim() : null,
    };
  }

  // Platte tekst voor de kopieerknop
  function reportToText(r) {
    if (!r || typeof r === "string") return r || "";
    const L = [r.title, r.sub, "", r.intro, ""];
    L.push("Kerncijfers: " + r.kpis.map((k) => k.l + " " + k.v + (k.d != null ? " (" + (k.d >= 0 ? "+" : "") + k.d + "%)" : "")).join(", "), "");
    r.tables.forEach((t) => { L.push(t.title); t.rows.forEach((row) => L.push("  " + row.join("  |  "))); L.push(""); });
    L.push("Aanbevelingen:"); r.recs.forEach((x, i) => L.push((i + 1) + ". " + x));
    if (r.context) { L.push("", "Context van het team: " + r.context); }
    return L.join("\n");
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
        if (out && out.ok !== false && (out.report || out.text)) { setReport({ text: out.report || out.text }); setBusy(false); return; }
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
            <div className="hrow" style={{ marginBottom: 8 }}>
              <div className="h2">Rapport</div>
              <button className="btn ghost" onClick={() => { try { navigator.clipboard.writeText(reportToText(report)); } catch {} }}>Kopieer</button>
            </div>
            <ReportView r={report} />
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
                <div className="insico">{it.ic}</div>
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
