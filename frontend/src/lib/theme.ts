export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "@academic:theme";
export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

/** Accepts only the three known values; anything else means "system". */
export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** The next preference when the toggle is clicked: light -> dark -> system. */
export function nextPreference(preference: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(preference);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

/**
 * Inline script that runs before the first paint: it applies a saved
 * explicit choice as `data-theme`, so there is no flash of the wrong theme.
 * With no saved choice nothing is set and the CSS follows the OS.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(v==="light"||v==="dark"){document.documentElement.setAttribute("data-theme",v);}}catch(e){}})();`;
