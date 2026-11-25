"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import NewsFormModal, { type NewsPayload } from "@/components/news/NewsFormModal";
import NewsList from "@/components/news/NewsList";
import PageHeading from "@/components/PageHeading";
import { Button, Pagination } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { classTitle } from "@/lib/academic";
import { hasAnyRole } from "@/lib/access";
import type { ClassView, NewsView, Paginated } from "@/types";

const PAGE_SIZE = 10;

export default function NewsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { profile } = useUser();
  const { canManage, roles } = usePermissions();
  const canPost = canManage || hasAnyRole(roles, ["teacher"]);

  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<NewsView> | null>(null);
  const [classes, setClasses] = useState<ClassView[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ post: NewsView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<NewsView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<Paginated<NewsView>>(`/news?page=${page}&pageSize=${PAGE_SIZE}`);
    setData(result.ok ? result.data : null);
    setLoading(false);
  }, [request, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canPost) return;
    request<Paginated<ClassView>>("/classes?status=approved&pageSize=100").then((result) =>
      setClasses(result.ok ? result.data.items : []),
    );
  }, [request, canPost]);

  const label = (classId: number | null) => {
    if (classId === null) return "Toda a instituição";
    const cls = classes.find((item) => item.id === classId);
    return cls ? classTitle(cls) : "Turma";
  };

  const save = async (payload: NewsPayload) => {
    const editing = form?.post ?? null;
    setSaving(true);
    const result = await request(editing ? `/news/${editing.id}` : "/news", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(editing ? { title: payload.title, body: payload.body } : payload),
    });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [editing ? "Aviso atualizado." : "Aviso publicado."] });
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
    <div className="p-6">
      <PageHeading
        title="Avisos"
        description="Notícias e avisos das suas turmas e da instituição."
        actions={canPost && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ post: null })}>Novo aviso</Button>}
      />
      <NewsList
        items={data?.items ?? []}
        loading={loading}
        canEdit={(post) => canManage || post.authorId === profile?.id}
        classLabel={label}
        onEdit={(post) => setForm({ post })}
        onDelete={setToDelete}
      />
      {data && data.total > PAGE_SIZE && (
        <div className="mt-4"><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} /></div>
      )}
      {form && (
        <NewsFormModal
          news={form.post}
          classes={classes.map((cls) => ({ id: cls.id, label: classTitle(cls) }))}
          canBroadcast={canManage}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}
      <ConfirmDialog open={toDelete !== null} title="Excluir aviso" message={`O aviso "${toDelete?.title}" será excluído.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </div>
  );
}
