"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "forgeops-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function snapshot() {
  return document.documentElement.classList.contains("dark");
}

/** The server has no document, so it always reports the light theme. */
function serverSnapshot() {
  return false;
}

/**
 * Dark mode toggle for the bonus requirements.
 *
 * The class lives on <html> and the palette is driven by CSS variables in
 * globals.css, so switching the class re-themes every utility built on those
 * tokens without re-rendering the tree. useSyncExternalStore keeps React in
 * step with the DOM attribute without a setState inside an effect. The inline
 * script in layout.tsx applies the same class before first paint, which avoids
 * a flash of the light theme.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing can refuse localStorage; the toggle still works.
    }
  }, []);

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
