import React from "react";
import { delta } from "../data";

export function Card({ title, children, style }) {
  return (
    <div className="card" style={style}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}

export function Scorecard({ label, value, cur, prev }) {
  const d = delta(cur, prev);
  return (
    <div className="card sc">
      <div className="lab">{label}</div>
      <div className="val">{value}</div>
      <div className={"delta " + d.cls}>{d.t ? d.t + " vs vorige periode" : "geen vergelijking"}</div>
    </div>
  );
}

export function Bars({ items, valKey = "sessions", fmt }) {
  const top = Math.max(...items.map((i) => i[valKey]), 1);
  return (
    <div>
      {items.map((c, i) => (
        <div className="bar" key={i}>
          <span className="bl">{c.name}</span>
          <span className="bt"><span className="bf" style={{ width: (c[valKey] / top) * 100 + "%" }} /></span>
          <span className="bv">{fmt ? fmt(c[valKey]) : Math.round(c[valKey]).toLocaleString("nl-NL")}</span>
        </div>
      ))}
    </div>
  );
}
