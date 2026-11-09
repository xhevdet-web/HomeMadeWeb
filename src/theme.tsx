import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const KEY = "homecreator-theme";

/**
 * Light mode is switched off for now: every visitor gets dark, whatever was saved before.
 * To bring it back, restore the commented code below (and the toggles in Nav and ProfilePage,
 * and the early script in index.html).
 */
function stored(): Theme {
  // try {
  //   return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  // } catch {
  //   return "dark";
  // }
  return "dark";
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "dark", setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

/** Dark by default; the choice is remembered in this browser. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(stored);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
