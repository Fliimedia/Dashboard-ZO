// Grafiekkleuren via CSS-variabelen, zodat ze met het thema meebewegen.
// De waarden worden live uit :root gelezen bij elke toegang.
function cv(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

export const COLORS = new Proxy({}, {
  get(_, k) {
    switch (k) {
      case "magenta": return cv("--magenta", "#E6007E");
      case "magenta2": return cv("--magenta2", "#FF4DA1");
      case "violet": return cv("--violet", "#141019");
      case "deepviolet": return cv("--deepviolet", "#141019");
      case "mist": return cv("--mist", "#6E6879");
      case "dim": return cv("--dim", "#9A93A8");
      case "surface": return cv("--chart-surface", "#fff");
      case "area": return cv("--chart-area", "rgba(20,16,25,.05)");
      case "border": return cv("--chart-border", "rgba(20,16,25,.16)");
      default: return "#000";
    }
  },
});

// AX/TT/SPLIT als getters op een proxy: elke toegang bouwt een verse, thema-actuele config.
export const AX = new Proxy({}, {
  get(_, k) {
    const obj = {
      axisLine: { lineStyle: { color: cv("--chart-axis", "#E6E3EC") } },
      axisTick: { show: false },
      axisLabel: { color: cv("--chart-label", "#6E6879"), fontFamily: "IBM Plex Mono", fontSize: 9 },
    };
    return obj[k];
  },
  ownKeys() { return ["axisLine", "axisTick", "axisLabel"]; },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});

export const TT = new Proxy({}, {
  get(_, k) {
    const obj = {
      backgroundColor: cv("--chart-tt", "#141019"),
      borderColor: cv("--chart-tt", "#141019"),
      textStyle: { color: cv("--chart-tt-ink", "#fff"), fontFamily: "IBM Plex Mono", fontSize: 11 },
      confine: true,
    };
    return obj[k];
  },
  ownKeys() { return ["backgroundColor", "borderColor", "textStyle", "confine"]; },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});

export const SPLIT = new Proxy({}, {
  get(_, k) {
    const obj = { lineStyle: { color: cv("--chart-split", "rgba(20,16,25,.07)"), type: "dashed" } };
    return obj[k];
  },
  ownKeys() { return ["lineStyle"]; },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});
