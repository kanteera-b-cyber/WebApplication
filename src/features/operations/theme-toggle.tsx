"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const STORAGE_KEY = "forgeops-theme";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match system", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const ThemeContext = createContext<{ theme: ThemeChoice; setTheme: (choice: ThemeChoice) => void } | null>(null);

function stored(): ThemeChoice {
  if (typeof document === "undefined") return "system";
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applies the choice to <html>.
 *
 * Only the `dark` class changes, and every colour in the interface resolves
 * through a CSS variable, so a re-theme needs no re-render and no component
 * knows which theme is active. The inline script in layout.tsx does the same
 * thing before first paint, which is what stops a flash of the wrong theme.
 */
function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read lazily on the client. On the server this falls back to "system", and
  // suppressHydrationWarning on <html> covers the one attribute that can differ.
  const [theme, setThemeState] = useState<ThemeChoice>(stored);

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private browsing can refuse localStorage; the toggle still works for
      // this page view.
    }
    apply(choice);
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== "system" || typeof window === "undefined") return;
    // Follow the operating system while the choice is "system".
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside a ThemeProvider.");
  return context;
}

/** The button in a header, which is a plain two-way toggle rather than a picker. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());

  const toggle = useCallback(() => {
    setTheme(dark ? "light" : "dark");
  }, [dark, setTheme]);

  return (
    <button
      type="button"
      onClick={toggle}
      className={className || "grid h-8 w-8 place-items-center rounded-[7px] border-0 bg-transparent text-muted transition hover:bg-brand-soft hover:text-ink"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
