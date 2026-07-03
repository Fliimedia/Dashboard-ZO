// Gedeelde targets, bewaard in localStorage en overal in de app gebruikt.
const KEY = "pos_targets";
const DEFAULTS = { growthPct: 15, dailyConv: 25 };

export function getTargets() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
  } catch { return { ...DEFAULTS }; }
}
export function setTargets(patch) {
  const next = { ...getTargets(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
