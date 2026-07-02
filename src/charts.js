import { niceDate, DOW } from "./data";

const grid = { left: 42, right: 16, top: 16, bottom: 26 };

export function areaLine(trend) {
  return {
    grid,
    tooltip: { trigger: "axis" },
    legend: { data: ["Sessies", "Gebruikers"], right: 0, top: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10 },
    xAxis: { type: "category", data: trend.map((t) => niceDate(t.date)) },
    yAxis: { type: "value" },
    series: [
      { name: "Sessies", type: "line", data: trend.map((t) => t.sessions), areaStyle: { color: "rgba(230,0,126,0.12)" } },
      { name: "Gebruikers", type: "line", data: trend.map((t) => t.users) },
    ],
  };
}

export function forecastLine(trend, projSeries) {
  const dates = trend.map((t) => niceDate(t.date));
  const future = projSeries.map((_, i) => "+" + (i + 1));
  const cats = dates.concat(future);
  const actual = trend.map((t) => t.sessions).concat(projSeries.map(() => null));
  const last = trend.length ? trend[trend.length - 1].sessions : 0;
  const proj = trend.map(() => null);
  proj[trend.length - 1] = last;
  const projFull = proj.concat(projSeries);
  return {
    grid,
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: cats },
    yAxis: { type: "value" },
    series: [
      { name: "Werkelijk", type: "line", data: actual, areaStyle: { color: "rgba(230,0,126,0.10)" } },
      { name: "Prognose", type: "line", data: projFull, lineStyle: { type: "dashed", color: "#3B1E5E" }, itemStyle: { color: "#3B1E5E" } },
    ],
  };
}

export function pie(segments) {
  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, icon: "circle", textStyle: { fontSize: 11 } },
    series: [{
      type: "pie",
      radius: ["52%", "74%"],
      center: ["50%", "44%"],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: "#fff", borderWidth: 2 },
      label: { show: false },
      data: segments.map((s) => ({ name: s.label, value: s.value })),
    }],
  };
}

export function barh(items, key = "sessions") {
  const rows = items.slice().reverse();
  return {
    grid: { left: 90, right: 24, top: 8, bottom: 20 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((r) => r.name) },
    series: [{
      type: "bar",
      data: rows.map((r) => r[key]),
      barWidth: "58%",
      itemStyle: { color: "#E6007E", borderRadius: [0, 4, 4, 0] },
    }],
  };
}

export function heatmap(cells) {
  const data = cells.map((c) => [c.hour, c.dow, c.sessions]);
  const max = Math.max(1, ...cells.map((c) => c.sessions));
  return {
    grid: { left: 40, right: 12, top: 10, bottom: 40 },
    tooltip: {
      formatter: (p) => DOW[p.value[1]] + " " + String(p.value[0]).padStart(2, "0") + "u: " + p.value[2] + " sessies",
    },
    xAxis: { type: "category", data: Array.from({ length: 24 }, (_, i) => i), splitArea: { show: true }, axisLabel: { interval: 2 } },
    yAxis: { type: "category", data: DOW.map((_, i) => DOW[i]), splitArea: { show: true } },
    visualMap: { min: 0, max, calculable: false, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#F6F4F9", "#F3A6D2", "#E6007E"] }, textStyle: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6E6879" } },
    series: [{ type: "heatmap", data, itemStyle: { borderColor: "#fff", borderWidth: 1 } }],
  };
}
