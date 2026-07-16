import { useState } from "react";
import { Card } from "../components/ui.jsx";
import { getTargets, setTargets } from "../targets.js";
import { CLIENTS } from "../data.js";
import { useUI, useT } from "../i18n.js";

const KEY = "pos_settings";
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

export default function Settings() {
  const { lang, setLang } = useUI();
  const tr = useT();
  const [s, setS] = useState(load);
  const [t, setT] = useState(getTargets());

  function upd(patch) { const next = { ...s, ...patch }; setS(next); save(next); }
  function updT(patch) { setT(setTargets(patch)); }

  return (
    <div className="view">
      <Card>
        <div className="h1 disp">{tr("settings")}</div>
        <div className="h2">{tr("settings_sub")}</div>

        <div className="setrow">
          <div className="setl">{tr("language")}</div>
          <select className="setin" value={lang} onChange={(e) => { setLang(e.target.value); upd({ lang: e.target.value }); }}>
            <option value="nl">{tr("dutch")}</option>
            <option value="en">{tr("english")}</option>
          </select>
        </div>

        <div className="setrow">
          <div className="setl">{tr("api_key")}</div>
          <input className="setin" type="password" placeholder="sk-ant-..." value={s.apiKey || ""}
            onChange={(e) => upd({ apiKey: e.target.value })} />
        </div>

        <div className="setrow">
          <div className="setl">{tr("ga_property")}</div>
          <div className="setv mono">{CLIENTS[0].id}</div>
        </div>

        <div className="setrow">
          <div className="setl">{tr("growth_target")}</div>
          <input className="setin" type="number" value={t.growthPct} onChange={(e) => updT({ growthPct: Math.max(0, Number(e.target.value) || 0) })} />
        </div>

        <div className="setrow">
          <div className="setl">{tr("daily_conv")}</div>
          <input className="setin" type="number" value={t.dailyConv} onChange={(e) => updT({ dailyConv: Math.max(1, Number(e.target.value) || 1) })} />
        </div>

        <div className="maphint">{lang === "en" ? "The API key is stored only locally in this browser. For server-side reports the key belongs in Vercel as ANTHROPIC_API_KEY." : "De API-sleutel wordt alleen lokaal in deze browser bewaard. Voor rapporten op de server hoort de sleutel als ANTHROPIC_API_KEY in Vercel te staan."}</div>
      </Card>
    </div>
  );
}
