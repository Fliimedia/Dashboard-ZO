import { useState } from "react";
import { Card } from "../components/ui.jsx";
import { BRAND, CLIENTS, wordmark } from "../data.js";

const CTX_KEY = "pos_report_context";

export default function Profile() {
  const [files, setFiles] = useState([]);
  const ctxInput = (() => { try { return localStorage.getItem(CTX_KEY) || ""; } catch { return ""; } })();

  function onUpload(e) {
    const fs = Array.from(e.target.files || []).map((f) => ({
      name: f.name,
      date: new Date().toLocaleDateString("nl-NL"),
    }));
    setFiles((prev) => [...prev, ...fs]);
    e.target.value = "";
  }

  return (
    <div className="view">
      <Card>
        <div className="h1 disp">Profiel</div>
        <div className="h2">Merk en account</div>
        <div className="profrow">
          <div className="blogo" style={{ width: 56, height: 56 }}>
            {BRAND.logo ? <img src={BRAND.logo} alt={BRAND.name} /> : <span className="wm">{wordmark(BRAND.name)}</span>}
          </div>
          <div>
            <div className="bname disp" style={{ color: "var(--ink)" }}>{BRAND.name}</div>
            <div className="btag" style={{ color: "var(--mist)" }}>{BRAND.tagline}</div>
            <div className="bsite" style={{ color: "var(--dim)" }}>{BRAND.site}</div>
          </div>
        </div>
        <div className="setrow"><div className="setl">Client</div><div className="setv">{CLIENTS[0].name}</div></div>
        <div className="setrow"><div className="setl">GA4 property</div><div className="setv mono">{CLIENTS[0].id}</div></div>
        <div className="setrow"><div className="setl">Rol</div><div className="setv">Beheerder</div></div>
      </Card>

      <Card>
        <div className="h1 disp">Brand database</div>
        <div className="h2">Strategieën, projecties en bronnen die de analyses voeden</div>
        <label className="btn bdup">
          Bestand uploaden
          <input type="file" multiple onChange={onUpload} hidden />
        </label>
        <div className="tscroll">
          <table className="bdtable">
            <thead><tr><th>Bron</th><th>Type</th><th className="num">Status</th></tr></thead>
            <tbody>
              <tr>
                <td><span className="cell"><span className="ci"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg></span>GA4 · {CLIENTS[0].id}</span></td>
                <td>Platform</td>
                <td className="num"><span className="bdok">Gekoppeld</span></td>
              </tr>
              {ctxInput && (
                <tr>
                  <td><span className="cell"><span className="ci"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg></span>Eigen input, rapporten</span></td>
                  <td>Input</td>
                  <td className="num">Opgeslagen</td>
                </tr>
              )}
              {files.map((f, i) => (
                <tr key={i}>
                  <td><span className="cell"><span className="ci"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg></span>{f.name}</span></td>
                  <td>Bestand</td>
                  <td className="num mono">{f.date}</td>
                </tr>
              ))}
              {!files.length && !ctxInput && (
                <tr><td colSpan="3" style={{ color: "var(--mist)", padding: "12px 0" }}>Nog geen bestanden geüpload. Voeg strategieën of projecties toe.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="h1 disp">Inloggen</div>
        <div className="h2">Accountbeheer volgt; login is nog niet actief in deze omgeving</div>
        <div className="setrow">
          <div className="setl">E-mail</div>
          <input className="setin" type="email" placeholder="naam@bedrijf.nl" disabled />
        </div>
        <button className="btn" disabled style={{ opacity: .55 }}>Inloggen binnenkort</button>
      </Card>
    </div>
  );
}
