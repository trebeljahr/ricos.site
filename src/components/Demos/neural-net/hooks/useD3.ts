import * as d3 from "d3";
import { useEffect, useRef } from "react";

export const useD3 = (
  renderChartFn: (...args: any[]) => any,
  dependencies: any[]
) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderChartFn(d3.select(ref.current));
    return () => {};
  }, [renderChartFn, dependencies]);

  return ref;
};
