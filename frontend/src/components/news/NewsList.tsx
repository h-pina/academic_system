"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card, EmptyState, IconButton } from "@/components/ui";
import { formatDateTime } from "@/lib/academic";
import type { NewsView } from "@/types";

interface NewsListProps {
  items: NewsView[];
  loading?: boolean;
  /** Who may edit or delete a post. */
  canEdit: (post: NewsView) => boolean;
  classLabel?: (classId: number | null) => string;
  onEdit: (post: NewsView) => void;
  onDelete: (post: NewsView) => void;
}

export default function NewsList({ items, loading, canEdit, classLabel, onEdit, onDelete }: NewsListProps) {
  if (!loading && items.length === 0) {
    return <Card><EmptyState title="Nenhum aviso" description="Quando houver avisos para você, eles aparecem aqui." /></Card>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((post) => (
        <li key={post.id}>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{post.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {post.authorName} · {formatDateTime(post.publishedAt)}
                  {classLabel && ` · ${classLabel(post.classId)}`}
                  {post.updatedAt !== post.publishedAt && " · editado"}
                </p>
              </div>
              {canEdit(post) && (
                <span className="flex gap-1">
                  <IconButton label={`Editar ${post.title}`} onClick={() => onEdit(post)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label={`Excluir ${post.title}`} onClick={() => onDelete(post)} className="hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></IconButton>
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{post.body}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
