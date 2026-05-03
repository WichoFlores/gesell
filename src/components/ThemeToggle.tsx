import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

function readStored(): Theme {
  const v = localStorage.getItem("theme");
  return v === "light" || v === "system" ? v : "dark";
}

function resolve(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", resolve(theme));
  localStorage.setItem("theme", theme);
}

const ICON: Record<Theme, string> = {
  dark: "☾",
  light: "☀",
  system: "◐",
};

const NEXT: Record<Theme, Theme> = {
  dark: "light",
  light: "system",
  system: "dark",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readStored());

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    apply(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="rounded p-1 text-sm text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-fg)]"
      aria-label={`Theme: ${theme}. Click to cycle.`}
    >
      {ICON[theme]}
    </button>
  );
}
