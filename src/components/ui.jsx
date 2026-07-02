export function Card({ children, className = "", ...rest }) {
  return <div className={"card " + className} {...rest}>{children}</div>;
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Kd({ v }) {
  const up = v >= 0;
  return <span className={"kd " + (up ? "up" : "down")} style={{ display: "inline" }}>{up ? "+" : ""}{v}%</span>;
}

export function fmtInt(v) { return Math.round(v).toLocaleString("nl-NL"); }
export function fmtDur(sec) { const m = Math.floor(sec / 60); return m + "m " + ("0" + Math.round(sec % 60)).slice(-2) + "s"; }
export function fmtPctDelta(cur, prev) {
  if (!prev) return 0;
  return Math.round(((cur - prev) / prev) * 100);
}
