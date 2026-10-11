"use client";

import { useState } from "react";
import PageHeading from "@/components/PageHeading";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import { formatCpf } from "@/lib/format";
import {
  validateProfileForm,
  type ProfileFormField,
} from "@/lib/validation";

export default function ProfilePage() {
  const { profile, roleName, actions } = useUser();
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<ProfileFormField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(Boolean(profile?.email));

  // The profile is refreshed from the API on load; fill the form once the
  // e-mail (added to /auth/me) is available.
  if (profile && !seeded && profile.email) {
    setName(profile.name);
    setEmail(profile.email);
    setSeeded(true);
  }

  if (!profile || !seeded) {
    return (
      <div className="max-w-xl space-y-4 p-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validateProfileForm({
      name,
      email,
      changePassword,
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    const result = await request("/users/me", {
      method: "PUT",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        ...(changePassword ? { currentPassword, newPassword } : {}),
      }),
    });
    setSaving(false);

    if (result.ok) {
      actions.setUser({ ...profile, name: name.trim(), email: email.trim() });
      setChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showMessage({ type: "SUCCESS", messages: ["Seus dados foram atualizados."] });
    }
  };

  return (
    <div className="max-w-2xl p-6">
      <PageHeading
        title="Meus dados"
        description="Atualize seu nome, e-mail e senha. CPF e matrícula só a secretaria altera."
      />

      <dl className="rounded-xl border border-slate-200 bg-surface shadow-card mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">CPF</dt>
          <dd className="mt-1 font-mono text-sm text-slate-900">{formatCpf(profile.cpf)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Matrícula
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-900">
            {profile.registrationNumber ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Perfis</dt>
          <dd className="mt-1 text-sm text-slate-900">{roleName || "Sem vínculo"}</dd>
        </div>
      </dl>

      <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-surface shadow-card space-y-4 p-5">
        <Field label="Nome" required error={errors.name}>
          {(control) => (
            <Input
              {...control}
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

        <Field label="E-mail" required error={errors.email}>
          {(control) => (
            <Input
              {...control}
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>

        {!changePassword ? (
          <button
            type="button"
            onClick={() => setChangePassword(true)}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Alterar senha
          </button>
        ) : (
          <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-700">
              Alterar senha
            </legend>
            <Field label="Senha atual" required error={errors.currentPassword}>
              {(control) => (
                <Input
                  {...control}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              )}
            </Field>
            <Field
              label="Nova senha"
              required
              hint="Pelo menos 8 caracteres."
              error={errors.newPassword}
            >
              {(control) => (
                <Input
                  {...control}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              )}
            </Field>
            <Field label="Confirmar nova senha" required error={errors.confirmPassword}>
              {(control) => (
                <Input
                  {...control}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              )}
            </Field>
            <button
              type="button"
              onClick={() => {
                setChangePassword(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setErrors({});
              }}
              className="text-sm text-slate-500 hover:underline"
            >
              Cancelar alteração de senha
            </button>
          </fieldset>
        )}

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button type="submit" loading={saving}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
