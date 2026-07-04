import { useState } from "react";
import { Card } from "../components/ui.jsx";
import { getTargets, setTargets } from "../targets.js";
import { CLIENTS } from "../data.js";

const KEY = "pos_settings";
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

export default function Settings() {
  const [s, setS] = useState(load);
  const [t, setT] = useState(getTargets());

  function upd(patch) { const next = { ...s, ...patch }; setS(next); save(next); }
  function updT(patch) { setT(setTargets(patch)); }

  return (
    <div className="view">
      <Card>
        <div className="h1 disp">Instellingen</div>
        <div className="h2">Taal, API-sleutel en targets</div>

        <div className="setrow">
          <div className="setl">Taal</div>
          <select className="setin" value={s.lang || "nl"} onChange={(e) => upd({ lang: e.target.value })}>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="setrow">
          <div className="setl">Anthropic API-sleutel</div>
          <input className="setin" type="password" placeholder="sk-ant-..." value={s.apiKey || ""}
            onChange={(e) => upd({ apiKey: e.target.value })} />
        </div>

        <div className="setrow">
          <div className="setl">GA4 property</div>
          <div className="setv mono">{CLIENTS[0].id}</div>
        </div>

        <div className="setrow">
          <div className="setl">Groeitarget %</div>
          <input className="setin" type="number" value={t.growthPct} onChange={(e) => updT({ growthPct: Math.max(0, Number(e.target.value) || 0) })} />
        </div>

        <div className="setrow">
          <div className="setl">Dagtarget conversies</div>
          <input className="setin" type="number" value={t.dailyConv} onChange={(e) => updT({ dailyConv: Math.max(1, Number(e.target.value) || 1) })} />
        </div>

        <div className="maphint">De API-sleutel wordt alleen lokaal in deze browser bewaard. Voor rapporten op de server hoort de sleutel als ANTHROPIC_API_KEY in Vercel te staan.</div>
      </Card>
    </div>
  );
}
