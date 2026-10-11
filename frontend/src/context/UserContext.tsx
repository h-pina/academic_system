"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildMenu, resolveRoleLabel } from "@/lib/access";
import { storage } from "@/lib/storage";
import type { AuthProfile, MenuItem } from "@/types";

interface UserContextValue {
  profile: AuthProfile | null;
  roleName: string;
  menu: MenuItem[];
  hydrated: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  actions: {
    setUser: (profile: AuthProfile) => void;
    clearUser: () => void;
  };
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setProfile(storage.getProfile());
    setHydrated(true);
  }, []);

  const menu = useMemo<MenuItem[]>(
    () => (profile ? buildMenu(profile.roles ?? []) : []),
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
        setSidebarOpen(true);
      },
      clearUser: () => {
        storage.clear();
        setProfile(null);
        setProfileOpen(false);
        setSidebarOpen(false);
      },
    }),
    [],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      profile,
      roleName,
      menu,
      hydrated,
      sidebarOpen,
      setSidebarOpen,
      profileOpen,
      setProfileOpen,
      actions,
    }),
    [profile, roleName, menu, hydrated, sidebarOpen, profileOpen, actions],
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
