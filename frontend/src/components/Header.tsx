"use client";

import { Boxes, LogOut, UserRound } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { profile, roleName, actions, profileOpen, setProfileOpen } = useUser();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
          <Boxes className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            Material Requisition System
          </p>
          <p className="text-xs text-slate-500">Internal operations</p>
        </div>
      </div>

      {profile && (
        <div className="flex items-center gap-2">
          <div className="mr-1 hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium text-slate-900">{profile.name}</p>
            <p className="text-xs text-slate-500">{roleName}</p>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700"
            title="Edit my data"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <UserRound className="h-5 w-5" />
          </button>

          <button
            onClick={() => actions.clearUser()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}
