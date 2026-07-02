import React, { useRef, useEffect } from "react";
import echarts from "../echartsSetup";

export default function Chart({ option, height = 220 }) {
  const el = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    inst.current = echarts.init(el.current, "flii");
    const ro = new ResizeObserver(() => inst.current && inst.current.resize());
    ro.observe(el.current);
    return () => { ro.disconnect(); inst.current.dispose(); };
  }, []);

  useEffect(() => {
    if (inst.current) inst.current.setOption(option, true);
  }, [option]);

  return <div ref={el} style={{ width: "100%", height }} />;
}
