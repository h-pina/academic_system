import { UserX } from "lucide-react";

/**
 * Shown to users that signed in but have no profile (staff, teacher or
 * student) linked to their account yet.
 */
export default function NoProfileNotice() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="rounded-xl border border-slate-200 bg-surface shadow-card max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <UserX className="h-6 w-6" />
        </span>
        <h1 className="text-base font-semibold text-slate-900">
          Cadastro sem vínculo
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Seu cadastro ainda não possui vínculo com a instituição. Procure a
          secretaria para concluir o seu acesso.
        </p>
      </div>
    </div>
  );
}
