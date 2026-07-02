import * as echarts from "echarts";

echarts.registerTheme("flii", {
  color: ["#E6007E", "#3B1E5E", "#9B6AC9", "#C9A2E8", "#6E6879"],
  backgroundColor: "transparent",
  textStyle: { fontFamily: "Inter, sans-serif", color: "#141019" },
  title: { textStyle: { color: "#141019", fontFamily: "Space Grotesk" } },
  legend: { textStyle: { color: "#6E6879" } },
  tooltip: {
    backgroundColor: "#141019",
    borderColor: "#141019",
    textStyle: { color: "#fff", fontFamily: "IBM Plex Mono", fontSize: 11 },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: "#E6E3EC" } },
    axisTick: { show: false },
    axisLabel: { color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 10 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#6E6879", fontFamily: "IBM Plex Mono", fontSize: 10 },
    splitLine: { lineStyle: { color: "#F0EEF4" } },
  },
  line: { symbol: "none", smooth: true, lineStyle: { width: 2.4 } },
});

export default echarts;
