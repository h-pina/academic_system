import { Badge } from "@/components/ui/Badge";
import { fillSemesters } from "@/lib/curriculum";
import type { CurriculumView } from "@/types";

interface CurriculumReadOnlyProps {
  curriculum: CurriculumView;
}

/** A curriculum by semester, for people who only read it. */
export default function CurriculumReadOnly({ curriculum }: CurriculumReadOnlyProps) {
  const semesters = fillSemesters(curriculum.semesters, curriculum.totalSemesters);

  return (
    <div className="space-y-4">
      {semesters.map((entry) => (
        <section
          key={entry.semester}
          aria-labelledby={`semester-${entry.semester}`}
          className="card overflow-hidden"
        >
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h3
              id={`semester-${entry.semester}`}
              className="text-sm font-semibold text-slate-700"
            >
              {entry.semester}º semestre
            </h3>
            <span className="text-sm tabular-nums text-slate-500">
              {entry.workloadHours} h
            </span>
          </header>

          {entry.items.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">
              Nenhuma disciplina neste semestre.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entry.items.map((item) => (
                <li
                  key={item.subjectId}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="w-24 font-mono text-xs text-slate-500">
                    {item.code}
                  </span>
                  <span className="min-w-[10rem] flex-1 font-medium text-slate-900">
                    {item.name}
                  </span>
                  <span className="text-sm tabular-nums text-slate-500">
                    {item.workloadHours} h
                  </span>
                  <Badge tone={item.mandatory ? "success" : "neutral"}>
                    {item.mandatory ? "Obrigatória" : "Optativa"}
                  </Badge>
                  <span className="min-w-[8rem] text-xs text-slate-500">
                    {item.prerequisites.length > 0
                      ? `Requer: ${item.prerequisites.map((p) => p.code).join(", ")}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
