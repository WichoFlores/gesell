import { useMemo } from "react";
import { useMarkDefs } from "@/store/marks";

export function MarkColorStyles() {
  const defs = useMarkDefs();
  const css = useMemo(() => {
    const lines = defs.map((d) => `--mark-${d.id}-color: ${d.color};`);
    return `:root { ${lines.join(" ")} }`;
  }, [defs]);
  return <style>{css}</style>;
}
