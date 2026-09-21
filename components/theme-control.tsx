"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

export function LifeThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}
    themes={["light", "dark"]} storageKey="life-maxim-theme" disableTransitionOnChange>{children}</ThemeProvider>;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <label className="theme-picker"><span>Theme</span><select aria-label="Theme"
    value={mounted ? resolvedTheme ?? "dark" : "dark"}
    onChange={event => setTheme(event.target.value)}>
    <option value="dark">Emerald Dark</option>
    <option value="light">Light</option>
  </select></label>;
}
