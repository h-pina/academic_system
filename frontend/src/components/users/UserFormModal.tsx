"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { isValidCpf, sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import { MIN_NAME_LENGTH, MIN_PASSWORD_LENGTH, isValidEmail } from "@/lib/validation";
import type { User } from "@/types";

export interface UserDraft {
  cpf: string;
  name: string;
  email: string;
  password?: string;
}

interface UserFormModalProps {
  /** `null` creates a user (without a profile); otherwise the user being edited. */
  user: User | null;
  loading: boolean;
  onClose: () => void;
  onSave: (draft: UserDraft) => void;
}

export default function UserFormModal({
  user,
  loading,
  onClose,
  onSave,
}: UserFormModalProps) {
  const editing = user !== null;
  const { showMessage } = useMessage();
  const { request } = useApi();

  const [cpf, setCpf] = useState(user?.cpf ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [cpfTaken, setCpfTaken] = useState(false);

  const checkCpfTaken = async () => {
    const digits = sanitizeCpf(cpf);
    if (editing || digits.length !== 11) return;

    const result = await request<{ exists: boolean }>(`/users/${digits}/exists`, {
      silent: true,
    });
    setCpfTaken(result.ok && result.data.exists);
  };

  const handleSubmit = () => {
    const errors: string[] = [];
    if (!editing && !isValidCpf(sanitizeCpf(cpf))) errors.push("Informe um CPF válido.");
    if (name.trim().length < MIN_NAME_LENGTH) {
      errors.push(`O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`);
    }
    if (!isValidEmail(email)) errors.push("Informe um e-mail válido.");
    if (!editing && password && password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }

    onSave({
      cpf: sanitizeCpf(cpf),
      name: name.trim(),
      email: email.trim(),
      password: password || undefined,
    });
  };

  return (
    <FormModal
      title={editing ? "Editar usuário" : "Novo usuário"}
      description={
        editing
          ? undefined
          : "O usuário é criado sem vínculo. O perfil (aluno, professor ou funcionário) é atribuído no cadastro correspondente."
      }
      submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
      loading={loading}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field
        label="CPF"
        required={!editing}
        error={cpfTaken ? "Já existe um usuário com este CPF." : undefined}
      >
        {(control) => (
          <Input
            {...control}
            inputMode="numeric"
            maxLength={14}
            value={formatCpf(cpf)}
            disabled={editing}
            onChange={(event) => {
              setCpf(event.target.value.replace(/\D/g, ""));
              setCpfTaken(false);
            }}
            onBlur={checkCpfTaken}
          />
        )}
      </Field>

      <Field label="Nome" required>
        {(control) => (
          <Input {...control} value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </Field>

      <Field label="E-mail" required>
        {(control) => (
          <Input
            {...control}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </Field>

      {!editing && (
        <Field
          label="Senha"
          hint="Deixe em branco para que a pessoa defina a senha no primeiro acesso."
        >
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
      )}
    </FormModal>
  );
}
