"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
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
          messages: ["A senha deve ter pelo menos 8 caracteres."],
        });
        return;
      }
      if (password !== confirmPassword) {
        showMessage({
          type: "ERROR",
          messages: ["As senhas não coincidem."],
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
        messages: ["Senha salva. Entrando..."],
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

  const showPasswordLabel = showPassword ? "Ocultar senha" : "Mostrar senha";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-canvas p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={56} className="mb-3" />
          <h1 className="text-xl font-extrabold text-slate-900">Sistema Acadêmico</h1>
          <p className="text-sm text-slate-500">Entre para continuar</p>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="relative mb-5 flex items-center justify-center">
            {identified && (
              <IconButton
                label="Voltar e trocar o CPF ou a matrícula"
                onClick={goBackToCpf}
                className="absolute left-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </IconButton>
            )}
            <h2 className="flex-1 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
              {identified ? "Senha" : "Identifique-se"}
            </h2>
          </div>

          {!identified ? (
            <form className="flex flex-col gap-4" onSubmit={handleCheckCpf} noValidate>
              <Field label="CPF ou matrícula" required>
                {(control) => (
                  <Input
                    {...control}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="Somente números"
                    maxLength={14}
                    value={identifierInput}
                    onChange={(event) => setIdentifierInput(event.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" size="lg">
                Continuar
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSignIn} noValidate>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
                <span className="text-xs text-slate-500">Olá</span>
                <p className="font-semibold text-slate-900">{identified.name}</p>
              </div>

              <Field
                label={needsNewPassword ? "Crie uma nova senha" : "Senha"}
                required
                hint={needsNewPassword ? "Pelo menos 8 caracteres." : undefined}
              >
                {(control) => (
                  <div className="relative">
                    <Input
                      {...control}
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      autoComplete={needsNewPassword ? "new-password" : "current-password"}
                      className="pr-11"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPasswordLabel}
                      title={showPasswordLabel}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}
              </Field>

              {needsNewPassword && (
                <Field label="Confirmar senha" required>
                  {(control) => (
                    <Input
                      {...control}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  )}
                </Field>
              )}

              <Button type="submit" size="lg">
                {needsNewPassword ? "Salvar senha e entrar" : "Entrar"}
              </Button>

              {identified.hasPassword && !resetting && (
                <button
                  type="button"
                  onClick={() => {
                    setResetting(true);
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-center text-sm font-medium text-brand-600 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              )}
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
