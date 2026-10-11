"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import UserFormModal, {
  type UserDraft,
} from "@/components/users/UserFormModal";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { ROLE_LABELS } from "@/lib/access";
import { formatCpf } from "@/lib/format";
import type { User } from "@/types";

const EMPTY_USER: UserDraft = {
  cpf: "",
  name: "",
  email: "",
  password: "",
};

export default function RegisterUsersPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);

  const [editingUser, setEditingUser] = useState<User | UserDraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    const result = await request<User[]>("/users");
    setUsers(result.ok ? result.data : []);
  }, [request]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleNew = () => {
    setEditingUser(EMPTY_USER);
    setIsEditing(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditing(true);
  };

  const handleSave = async (draft: UserDraft) => {
    setBusy(true);
    const result = isEditing
      ? await request(`/users/${draft.cpf}`, {
          method: "PUT",
          body: JSON.stringify({
            name: draft.name,
            email: draft.email,
          }),
        })
      : await request(`/users`, {
          method: "POST",
          body: JSON.stringify({
            cpf: draft.cpf,
            name: draft.name,
            email: draft.email,
            ...(draft.password ? { password: draft.password } : {}),
          }),
        });
    setBusy(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [isEditing ? "Usuário atualizado." : "Usuário cadastrado."],
      });
      setEditingUser(null);
      loadUsers();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    const target = userToDelete;
    setUserToDelete(null);

    const result = await request(`/users/${target.cpf}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Usuário excluído."] });
      loadUsers();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {users.length} usuário{users.length === 1 ? "" : "s"}
        </p>
        <Button label="Novo usuário" variant="add" onClick={handleNew} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>CPF</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfis</th>
                <th className="w-32 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.cpf}>
                  <td className="font-mono text-xs text-slate-600">
                    {formatCpf(user.cpf)}
                  </td>
                  <td className="font-medium text-slate-900">{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 && (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Sem vínculo
                        </span>
                      )}
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                        >
                          {ROLE_LABELS[role]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="edit"
                        hint="Editar este usuário"
                        onClick={() => handleEdit(user)}
                      />
                      <Button
                        variant="delete"
                        hint="Excluir este usuário"
                        onClick={() => setUserToDelete(user)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <UserFormModal
          user={editingUser}
          editing={isEditing}
          loading={busy}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={userToDelete !== null}
        title="Confirmar exclusão"
        message={`Tem certeza de que deseja excluir o usuário "${userToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
}
