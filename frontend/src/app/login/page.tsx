"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import { normalizeLoginIdentifier } from "@/lib/identifier";
import { storage } from "@/lib/storage";
import type { AccessInfo, AuthProfile, LoginResponse } from "@/types";

interface IdentifiedUser {
  identifier: string;
  name: string;
  hasPassword: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { profile, hydrated, actions } = useUser();
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [identifierInput, setIdentifierInput] = useState("");
  const [identified, setIdentified] = useState<IdentifiedUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hydrated && profile) router.replace("/app");
  }, [hydrated, profile, router]);

  const needsNewPassword = identified ? !identified.hasPassword || resetting : false;

  const handleCheckCpf = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeLoginIdentifier(identifierInput);

    if (!normalized.ok) {
      showMessage({ type: "WARNING", messages: [normalized.error] });
      return;
    }

    const result = await request<AccessInfo>(
      `/auth/access/${normalized.value}`,
      { auth: false },
    );
    if (!result.ok) return;

    setIdentified({
      identifier: normalized.value,
      name: result.data.name,
      hasPassword: result.data.hasPassword,
    });
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!identified) return;

    if (needsNewPassword) {
      if (password.length < 8) {
        showMessage({
          type: "WARNING",
          messages: ["The password must be at least 8 characters long."],
        });
        return;
      }
      if (password !== confirmPassword) {
        showMessage({
          type: "ERROR",
          messages: ["The passwords do not match."],
        });
        return;
      }

      const reset = await request(`/auth/password/reset`, {
        method: "PUT",
        auth: false,
        body: JSON.stringify({
          identifier: identified.identifier,
          newPassword: password,
        }),
      });
      if (!reset.ok) return;

      showMessage({
        type: "SUCCESS",
        messages: ["Password saved. Signing you in..."],
      });
    }

    const login = await request<LoginResponse>(`/auth/login`, {
      method: "POST",
      auth: false,
      body: JSON.stringify({ identifier: identified.identifier, password }),
    });
    if (!login.ok) return;

    storage.setToken(login.data.accessToken);

    const me = await request<AuthProfile>(`/auth/me`);
    if (!me.ok) return;

    actions.setUser(me.data);
    router.replace("/app");
  };

  const goBackToCpf = () => {
    setIdentified(null);
    setResetting(false);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="text-base font-semibold text-slate-900">
            Sistema Acadêmico
          </h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="relative mb-5 flex items-center justify-center">
            {identified && (
              <button
                type="button"
                onClick={goBackToCpf}
                className="absolute left-0 flex items-center text-slate-500 transition hover:text-brand-600"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="flex-1 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
              {identified ? "Password" : "Identify yourself"}
            </h2>
          </div>

          {!identified ? (
            <form className="flex flex-col gap-4" onSubmit={handleCheckCpf}>
              <div>
                <label htmlFor="identifier" className="field-label">
                  CPF ou matrícula
                </label>
                <input
                  id="identifier"
                  type="text"
                  inputMode="numeric"
                  placeholder="Somente números"
                  value={identifierInput}
                  maxLength={14}
                  onChange={(event) =>
                    setIdentifierInput(event.target.value)
                  }
                  className="field-input"
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Continue
              </button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSignIn}>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
                <span className="text-xs text-slate-500">Welcome</span>
                <p className="font-semibold text-slate-900">{identified.name}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="field-label">
                    {needsNewPassword ? "Create a new password" : "Password"}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="field-input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {needsNewPassword && (
                  <div>
                    <label htmlFor="confirm" className="field-label">
                      Confirm password
                    </label>
                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="field-input"
                      required
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="mt-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {needsNewPassword ? "Save password and sign in" : "Sign in"}
              </button>

              {identified.hasPassword && !resetting && (
                <div className="mt-1 flex justify-center border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setResetting(true);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
