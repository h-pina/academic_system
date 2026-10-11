import type { AuthProfile } from "@/types";

const KEYS = {
  TOKEN: "@rm:token",
  PROFILE: "@rm:profile",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const storage = {
  getToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(KEYS.TOKEN);
  },

  setToken(token: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(KEYS.TOKEN, token);
  },

  getProfile(): AuthProfile | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(KEYS.PROFILE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthProfile;
    } catch {
      return null;
    }
  },

  setProfile(profile: AuthProfile): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },

  clear(): void {
    if (!isBrowser()) return;
    Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
  },
};
