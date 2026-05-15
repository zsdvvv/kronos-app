import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "modern" | "classic" | "dark";

export interface ThemeColors {
  background: string;
  cardBg: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  hover: string;
  shadow: string;
  danger: string;
  success: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  modern: {
    background: "#f7f6f2",
    cardBg: "#fffefa",
    primary: "#2f3e35",
    secondary: "#7d8a74",
    accent: "#e8a95e",
    text: "#1a1a1a",
    textMuted: "#6b7280",
    border: "#e5e5e0",
    hover: "#edece8",
    shadow: "rgba(0,0,0,0.08)",
    danger: "#dc2626",
    success: "#16a34a",
  },
  classic: {
    background: "#fdfbf7",
    cardBg: "#ffffff",
    primary: "#3a4f41",
    secondary: "#f4e285",
    accent: "#bc6c25",
    text: "#2b2b2b",
    textMuted: "#6b6560",
    border: "#e8e4dc",
    hover: "#f5f0e8",
    shadow: "rgba(0,0,0,0.06)",
    danger: "#c2410c",
    success: "#3a4f41",
  },
  dark: {
    background: "#101010",
    cardBg: "#1a1a1a",
    primary: "#00f0ff",
    secondary: "#ff0055",
    accent: "#ffffff",
    text: "#e0e0e0",
    textMuted: "#888888",
    border: "#2a2a2a",
    hover: "#252525",
    shadow: "rgba(0,240,255,0.08)",
    danger: "#ff4444",
    success: "#00f0ff",
  },
};

interface ThemeState {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "modern",
      colors: themes.modern,
      setTheme: (theme) => set({ theme, colors: themes[theme] }),
    }),
    { name: "kronos-theme" }
  )
);

export { themes };
