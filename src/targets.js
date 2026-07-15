// Gedeelde targets, bewaard in localStorage en overal in de app gebruikt.
const KEY = "pos_targets";
const DEFAULTS = { growthPct: 15, dailyConv: 25, tVisitors: 14000, tConv: 620, tSpend: 4500, tReach: 90000 };

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
