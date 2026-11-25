"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import NewsFormModal, { type NewsPayload } from "@/components/news/NewsFormModal";
import NewsList from "@/components/news/NewsList";
import { Button } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import type { ClassView, NewsView, Paginated } from "@/types";

export default function ClassNewsTab({ cls, canPost }: { cls: ClassView; canPost: boolean }) {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { profile } = useUser();
  const { canManage } = usePermissions();
  const [items, setItems] = useState<NewsView[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ post: NewsView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<NewsView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<Paginated<NewsView>>(`/news?classId=${cls.id}&pageSize=50`);
    setItems(result.ok ? result.data.items : []);
    setLoading(false);
  }, [request, cls.id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload: NewsPayload) => {
    const editing = form?.post ?? null;
    setSaving(true);
    const result = await request(editing ? `/news/${editing.id}` : "/news", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(editing ? { title: payload.title, body: payload.body } : { ...payload, classId: cls.id }),
    });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [editing ? "Aviso atualizado." : "Aviso publicado para a turma."] });
      setForm(null);
      load();
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    const result = await request(`/news/${target.id}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Aviso excluído."] });
      load();
    }
  };

  return (
    <div>
      {canPost && (
        <div className="mb-4">
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ post: null })}>Novo aviso</Button>
        </div>
      )}
      <NewsList
        items={items}
        loading={loading}
        canEdit={(post) => canManage || post.authorId === profile?.id}
        onEdit={(post) => setForm({ post })}
        onDelete={setToDelete}
      />
      {form && (
        <NewsFormModal news={form.post} classes={[]} canBroadcast={false} fixedClassId={cls.id} loading={saving} onClose={() => setForm(null)} onSave={save} />
      )}
      <ConfirmDialog open={toDelete !== null} title="Excluir aviso" message={`O aviso "${toDelete?.title}" será excluído.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </div>
  );
}
