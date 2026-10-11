import { EmptyState } from "@/components/ui/EmptyState";

/** Shown when the dashboard has no student section to build a screen from. */
export default function NoStudentCourse({ failed }: { failed: boolean }) {
  return (
    <div className="card">
      <EmptyState
        title={failed ? "Não foi possível carregar seu curso" : "Seu curso não está disponível"}
        description={
          failed
            ? "Tente novamente em instantes. Se o problema continuar, procure a secretaria."
            : "Seu vínculo de aluno ainda não tem um curso. Procure a secretaria."
        }
      />
    </div>
  );
}
