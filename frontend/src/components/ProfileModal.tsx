"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";

interface OwnProfilePayload {
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}

export default function ProfileModal() {
  const { profile, setProfileOpen } = useUser();
  const { showMessage } = useMessage();
  const { request } = useApi();

  const [emailLoaded, setEmailLoaded] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState("");

  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const result = await request<{ email: string }>(
        `/users/${profile.cpf}/email`,
        { auth: false },
      );
      if (active && result.ok) {
        setEmail(result.data.email);
        setEmailLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile, request]);

  if (!profile || !emailLoaded) return null;

  const handleSubmit = async () => {
    if (name.trim().length < 3) {
      showMessage({
        type: "WARNING",
        messages: ["O nome deve ter pelo menos 3 caracteres."],
      });
      return;
    }

    const payload: OwnProfilePayload = { name: name.trim(), email: email.trim() };

    if (changePassword) {
      if (newPassword.length < 8) {
        showMessage({
          type: "WARNING",
          messages: ["A nova senha deve ter pelo menos 8 caracteres."],
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        showMessage({
          type: "ERROR",
          messages: ["As senhas não coincidem."],
        });
        return;
      }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    setSaving(true);
    const result = await request("/users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: ["Seus dados foram atualizados."],
      });
      setProfileOpen(false);
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    setValue: (next: string) => void,
    show: boolean,
    setShow: (next: boolean) => void,
  ) => (
    <div className="mb-4">
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="field-input pr-10"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <h2 className="modal-title">Meus dados</h2>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Dados da conta
          </h3>

          <div className="mb-4">
            <label className="field-label">CPF</label>
            <input
              type="text"
              value={profile.cpf}
              readOnly
              disabled
              className="field-input"
            />
          </div>

          <div className="mb-4">
            <label className="field-label">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input"
            />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Security
          </h3>

          {!changePassword ? (
            <button
              onClick={() => setChangePassword(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Alterar senha
            </button>
          ) : (
            <>
              {renderPasswordField(
                "Senha atual",
                currentPassword,
                setCurrentPassword,
                showCurrent,
                setShowCurrent,
              )}
              {renderPasswordField(
                "Nova senha",
                newPassword,
                setNewPassword,
                showNew,
                setShowNew,
              )}
              {renderPasswordField(
                "Confirmar nova senha",
                confirmPassword,
                setConfirmPassword,
                showConfirm,
                setShowConfirm,
              )}
              <button
                type="button"
                onClick={() => {
                  setChangePassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="mt-1 text-sm text-slate-500 hover:underline"
              >
                Cancelar alteração de senha
              </button>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button
            label="Cancelar"
            variant="cancel"
            onClick={() => setProfileOpen(false)}
          />
          <Button
            label="Salvar alterações"
            variant="save"
            loading={saving}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
