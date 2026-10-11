"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NavSection } from "@/config/navigation";
import { buildNavigation, resolveRoleLabel } from "@/lib/access";
import { storage } from "@/lib/storage";
import type { AuthProfile } from "@/types";

interface UserContextValue {
  profile: AuthProfile | null;
  roleName: string;
  /** The sections of the user's navigation, designed for their profiles. */
  navigation: NavSection[];
  hydrated: boolean;
  actions: {
    setUser: (profile: AuthProfile) => void;
    clearUser: () => void;
  };
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(storage.getProfile());
    setHydrated(true);
  }, []);

  const navigation = useMemo<NavSection[]>(
    () => (profile ? buildNavigation(profile.roles ?? []) : []),
    [profile],
  );

  const roleName = useMemo(
    () => (profile ? resolveRoleLabel(profile.roles ?? []) : ""),
    [profile],
  );

  const actions = useMemo(
    () => ({
      setUser: (next: AuthProfile) => {
        storage.setProfile(next);
        setProfile(next);
      },
      clearUser: () => {
        storage.clear();
        setProfile(null);
      },
    }),
    [],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      profile,
      roleName,
      navigation,
      hydrated,
      actions,
    }),
    [profile, roleName, navigation, hydrated, actions],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside a UserProvider");
  }
  return context;
}
