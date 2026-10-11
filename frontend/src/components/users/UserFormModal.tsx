"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { useApi } from "@/hooks/useApi";
import { useFormErrors } from "@/hooks/useFormErrors";
import { sanitizeCpf } from "@/lib/cpf";
import type { FieldErrors } from "@/lib/fieldErrors";
import { formatCpf } from "@/lib/format";
import { userFieldErrors } from "@/lib/validation";
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
  /** Validation errors returned by the API, keyed by field. */
  errors?: FieldErrors;
  onClose: () => void;
  onSave: (draft: UserDraft) => void;
}

export default function UserFormModal({
  user,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: UserFormModalProps) {
  const editing = user !== null;
  const { request } = useApi();
  const form = useFormErrors(serverErrors);

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
    const found = userFieldErrors(
      { cpf, name, email, password },
      { creating: !editing },
    );
    if (cpfTaken) found.cpf = "Já existe um usuário com este CPF.";

    if (Object.keys(found).length > 0) {
      form.setErrors(found as FieldErrors);
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
      errors={form.errors}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field
        label="CPF"
        required={!editing}
        error={form.errors.cpf ?? (cpfTaken ? "Já existe um usuário com este CPF." : undefined)}
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
              form.clear("cpf");
            }}
            onBlur={checkCpfTaken}
          />
        )}
      </Field>

      <Field label="Nome" required error={form.errors.name}>
        {(control) => (
          <Input
            {...control}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              form.clear("name");
            }}
          />
        )}
      </Field>

      <Field label="E-mail" required error={form.errors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              form.clear("email");
            }}
          />
        )}
      </Field>

      {!editing && (
        <Field
          label="Senha"
          error={form.errors.password}
          hint="Deixe em branco para que a pessoa defina a senha no primeiro acesso."
        >
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                form.clear("password");
              }}
            />
          )}
        </Field>
      )}
    </FormModal>
  );
}
