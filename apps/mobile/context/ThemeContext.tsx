import React, { createContext, useContext, useState, ReactNode } from "react";
import { themeColors, type ThemeMode } from "../constants/theme";

interface ThemeContextType {
  themeMode: ThemeMode;
  colors: typeof themeColors.light;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "light",
  colors: themeColors.light,
  isDark: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const colors = themeColors[themeMode];
  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colors,
        isDark,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
