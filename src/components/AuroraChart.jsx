import { useEffect, useRef, useState } from "react";

// Custom canvas dag-grafiek: bewegend raster, gradient-gloedlijn (koel bij dalen,
// fel bij pieken), aurora-mesh vulling, geanimeerde opbouw en pulserend eindpunt.
// Thema-bewust via CSS-variabelen; leest kleuren live uit :root.
function cssvar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}
// hex -> {r,g,b}
function hexRGB(hex, fb) {
  const h = (hex || "").replace("#", "");
  if (h.length === 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  return fb;
}

export default function AuroraChart({
  days, values, target, unit = "", label = "", theme, height = 216,
}) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const raf = useRef(0);
  const start = useRef(0);
  const hover = useRef(null);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    const canvas = ref.current, wrap = wrapRef.current;
    if (!canvas || !wrap || !values || values.length < 2) return;
    const ctx = canvas.getContext("2d");
    start.current = performance.now();

    // themakleuren
    const brand = hexRGB(cssvar("--magenta", "#E6007E"), { r: 230, g: 0, b: 126 });
    const brand2 = hexRGB(cssvar("--magenta2", "#FF4DA1"), { r: 255, g: 77, b: 161 });
    const cool = theme === "dark" ? { r: 90, g: 150, b: 255 } : { r: 90, g: 140, b: 235 };
    const gridCol = cssvar("--chart-split", "rgba(20,16,25,.07)");
    const axisLabel = cssvar("--chart-label", "#6E6879");
    const targetCol = cssvar("--deepviolet", "#141019");
    const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

    const mn = Math.min(...values), mx = Math.max(...values);
    const range = mx - mn || 1;
    const padL = 34, padR = 12, padT = 14, padB = 20;

    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    const px = (i) => padL + (i / (values.length - 1)) * (W - padL - padR);
    const py = (v) => padT + (1 - (v - mn) / range) * (H - padT - padB);

    // gladde pad-punten
    function pathPoints() { return values.map((v, i) => ({ x: px(i), y: py(v), v })); }
    function tracePath(pts, upTo) {
      ctx.moveTo(pts[0].x, pts[0].y);
      const n = upTo == null ? pts.length : upTo;
      for (let i = 0; i < n - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2, yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      if (n >= 2) { const l = pts[n - 1]; ctx.quadraticCurveTo(l.x, l.y, l.x, l.y); }
    }

    function draw(now) {
      const t = (now - start.current) / 1000;
      const build = Math.min(1, t / 1.1); // opbouw-animatie 1.1s
      const ease = 1 - Math.pow(1 - build, 3);
      ctx.clearRect(0, 0, W, H);

      // 1) bewegend raster
      ctx.strokeStyle = gridCol; ctx.lineWidth = 1;
      const gap = 34, off = (t * 14) % gap;
      for (let x = padL - off; x < W - padR + gap; x += gap) {
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      }
      for (let gy = 0; gy <= 4; gy++) {
        const y = padT + (gy / 4) * (H - padT - padB);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      }

      const pts = pathPoints();
      const shownX = padL + ease * (W - padL - padR);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, shownX + 2, H); ctx.clip();

      // 2) aurora-mesh vulling
      const fill = ctx.createLinearGradient(0, padT, 0, H - padB);
      fill.addColorStop(0, rgba(brand, 0.42));
      fill.addColorStop(0.5, rgba(brand, 0.14));
      fill.addColorStop(1, rgba(brand, 0));
      ctx.beginPath(); tracePath(pts);
      ctx.lineTo(pts[pts.length - 1].x, H - padB);
      ctx.lineTo(pts[0].x, H - padB); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();

      // 3) gradient-gloedlijn: koel bij lage, fel bij hoge waarden
      const lg = ctx.createLinearGradient(padL, 0, W - padR, 0);
      values.forEach((v, i) => {
        const f = (v - mn) / range; // 0 laag .. 1 hoog
        const c = { r: Math.round(cool.r + (brand2.r - cool.r) * f),
                    g: Math.round(cool.g + (brand2.g - cool.g) * f),
                    b: Math.round(cool.b + (brand2.b - cool.b) * f) };
        lg.addColorStop(i / (values.length - 1), rgba(c, 1));
      });
      ctx.beginPath(); tracePath(pts);
      ctx.strokeStyle = lg; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.shadowColor = rgba(brand, 0.85); ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // 4) targetlijn (gestippeld)
      if (target != null) {
        const ty = py(target);
        ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba(hexRGB(targetCol, { r: 20, g: 16, b: 25 }), theme === "dark" ? 0.7 : 0.5);
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(padL, ty); ctx.lineTo(W - padR, ty); ctx.stroke();
        ctx.setLineDash([]);
      }

      // 5) pulserend eindpunt (verschijnt na de opbouw)
      if (build >= 1) {
        const last = pts[pts.length - 1];
        const pulse = 5 + Math.sin(t * 3) * 2.5;
        ctx.beginPath(); ctx.arc(last.x, last.y, pulse + 5, 0, 7); ctx.fillStyle = rgba(brand2, 0.22); ctx.fill();
        ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, 7); ctx.fillStyle = "#fff";
        ctx.shadowColor = rgba(brand2, 0.9); ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      }

      // 6) hover-marker
      if (hover.current != null && build >= 1) {
        const i = hover.current, p = pts[i];
        ctx.strokeStyle = rgba(brand, 0.35); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, padT); ctx.lineTo(p.x, H - padB); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fillStyle = rgba(brand2, 1);
        ctx.shadowColor = rgba(brand2, 0.9); ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
      }

      // 7) y-as labels (min/mid/max)
      ctx.fillStyle = axisLabel; ctx.font = "9px 'IBM Plex Mono', monospace"; ctx.textAlign = "right";
      [mx, (mx + mn) / 2, mn].forEach((val, k) => {
        const y = padT + (k / 2) * (H - padT - padB);
        ctx.fillText(Math.round(val).toString(), padL - 6, y + 3);
      });

      raf.current = requestAnimationFrame(draw);
    }
    raf.current = requestAnimationFrame(draw);

    // hover-afhandeling
    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const rel = (x - padL) / (W - padL - padR);
      const i = Math.round(rel * (values.length - 1));
      if (i >= 0 && i < values.length) {
        hover.current = i;
        setTip({ x: px(i), y: py(values[i]), i, v: values[i] });
      } else { hover.current = null; setTip(null); }
    }
    function onLeave() { hover.current = null; setTip(null); }
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf.current); ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [days, values, target, theme, height, label]);

  return (
    <div ref={wrapRef} style={{ position: "relative", height }}>
      <canvas ref={ref} style={{ display: "block" }} />
      {tip && (
        <div className="auroratip" style={{ left: Math.min(Math.max(tip.x, 60), (wrapRef.current?.clientWidth || 300) - 60) }}>
          <span className="att-d">{days[tip.i]?.date}</span>
          <span className="att-v">{label}: <b>{tip.v.toLocaleString("nl-NL")}{unit}</b></span>
          {target != null && <span className="att-t">Target {target.toLocaleString("nl-NL")}{unit}</span>}
        </div>
      )}
    </div>
  );
}
