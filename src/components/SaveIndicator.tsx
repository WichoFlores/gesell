import { useEffect, useState } from "react";
import { useUI } from "@/store/ui";

export function SaveIndicator() {
  const status = useUI((s) => s.saveStatus);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "saving") {
      setVisible(true);
      return;
    }
    if (status === "saved") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1200);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [status]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-1 text-xs text-[color:var(--color-muted)] shadow-sm transition-opacity">
      {status === "saving" ? "Saving…" : "Saved"}
    </div>
  );
}
