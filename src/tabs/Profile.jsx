import { Card } from "../components/ui.jsx";
import { BRAND, CLIENTS, wordmark } from "../data.js";

export default function Profile() {
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
