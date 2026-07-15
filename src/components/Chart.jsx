import { useEffect, useRef } from "react";
import * as echarts from "echarts";

// Chart-wrapper: initialiseert ECharts, volgt containergrootte en
// werkt opties bij zonder opnieuw te initialiseren.
export default function Chart({ option, height = 200, onInit, onClick, style }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = echarts.init(el);
    chartRef.current = c;
    if (onInit) onInit(c);
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el);
    return () => { ro.disconnect(); c.dispose(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    if (chartRef.current && option) chartRef.current.setOption(option, { notMerge: true });
  }, [option]);

  useEffect(() => {
    const c = chartRef.current;
    if (!c || !onClick) return;
    c.on("click", onClick);
    return () => c.off("click", onClick);
  }, [onClick]);

  return <div ref={ref} className="chartbox" style={{ height, ...style }} />;
}
