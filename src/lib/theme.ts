export type ThemeChoice = "light" | "dark" | "system";

export function applyTheme(theme: ThemeChoice) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
    document.cookie = `kairos_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  }
  try {
    localStorage.setItem("kairos-theme", theme);
  } catch {
    // ignore storage failures
  }
}
