"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmModal from "@/components/ConfirmModal";
import UserFormModal, {
  type UserDraft,
} from "@/components/users/UserFormModal";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { resolveRoleName } from "@/lib/access";
import { formatCpf } from "@/lib/format";
import type { User } from "@/types";

const EMPTY_USER: UserDraft = {
  cpf: "",
  name: "",
  email: "",
  roleId: 0,
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
            roleId: draft.roleId,
          }),
        })
      : await request(`/users`, {
          method: "POST",
          body: JSON.stringify({
            cpf: draft.cpf,
            name: draft.name,
            email: draft.email,
            roleId: draft.roleId,
            ...(draft.password ? { password: draft.password } : {}),
          }),
        });
    setBusy(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [isEditing ? "User updated." : "User created."],
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
      showMessage({ type: "SUCCESS", messages: ["User deleted."] });
      loadUsers();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {users.length} user{users.length === 1 ? "" : "s"}
        </p>
        <Button label="Add user" variant="add" onClick={handleNew} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>CPF</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="w-32 text-center">Actions</th>
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
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {resolveRoleName(user.roleId)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="edit"
                        hint="Edit this user"
                        onClick={() => handleEdit(user)}
                      />
                      <Button
                        variant="delete"
                        hint="Delete this user"
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
                    No users registered yet.
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

      <ConfirmModal
        open={userToDelete !== null}
        title="Confirm deletion"
        message={`Are you sure you want to delete the user "${userToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
}
