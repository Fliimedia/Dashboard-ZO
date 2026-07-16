import { Card } from "../components/ui.jsx";
import { BRAND, CLIENTS, wordmark } from "../data.js";
import { useT } from "../i18n.js";

export default function Profile() {
  const t = useT();
  const name = t("brand_name");
  return (
    <div className="view">
      <Card>
        <div className="h1 disp">{t("profile")}</div>
        <div className="h2">{t("brand_account")}</div>
        <div className="profrow">
          <div className="blogo" style={{ width: 56, height: 56 }}>
            {BRAND.logo ? <img src={BRAND.logo} alt={name} /> : <span className="wm">{wordmark(name)}</span>}
          </div>
          <div>
            <div className="bname disp" style={{ color: "var(--ink)" }}>{name}</div>
            <div className="btag" style={{ color: "var(--mist)" }}>{t("brand_tagline")}</div>
            <div className="bsite" style={{ color: "var(--dim)" }}>{t("brand_site")}</div>
          </div>
        </div>
        <div className="setrow"><div className="setl">{t("client")}</div><div className="setv">{CLIENTS[0].name}</div></div>
        <div className="setrow"><div className="setl">{t("ga_property")}</div><div className="setv mono">{CLIENTS[0].id}</div></div>
        <div className="setrow"><div className="setl">{t("role")}</div><div className="setv">{t("admin")}</div></div>
      </Card>
      <Card>
        <div className="h1 disp">{t("login")}</div>
        <div className="h2">{t("account_mgmt_sub")}</div>
        <div className="setrow">
          <div className="setl">{t("email")}</div>
          <input className="setin" type="email" placeholder="naam@bedrijf.nl" disabled />
        </div>
        <button className="btn" disabled style={{ opacity: .55 }}>{t("login_soon")}</button>
      </Card>
    </div>
  );
}
