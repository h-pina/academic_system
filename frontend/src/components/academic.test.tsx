// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarFormModal from "@/components/calendar/CalendarFormModal";
import ClassFormModal from "@/components/classes/ClassFormModal";
import PromptModal from "@/components/classes/PromptModal";
import ScheduleEditor from "@/components/classes/ScheduleEditor";
import NewsFormModal from "@/components/news/NewsFormModal";
import NewsList from "@/components/news/NewsList";
import type { NewsView, Semester } from "@/types";
import { useState } from "react";
import type { SlotDraft } from "@/lib/academic";

const calendar = {
  id: 1,
  description: "Calendário 2026",
  startDate: "2026-02-02",
  endDate: "2026-06-30",
  enrollmentStart: "2026-02-02",
  enrollmentEnd: "2026-02-20",
  withdrawalDeadline: "2026-04-15",
  gradesDeadline: "2026-07-10",
};
const semester: Semester = {
  id: 1,
  calendarId: 1,
  year: 2026,
  term: 1,
  startDate: "2026-02-02",
  endDate: "2026-06-30",
  status: "active",
  calendar,
};

describe("CalendarFormModal", () => {
  it("does not send an inconsistent calendar and says which field is wrong", async () => {
    const onSave = vi.fn();
    render(<CalendarFormModal calendar={{ ...calendar, endDate: "2026-01-01" }} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText("O fim deve ser posterior ao início.")).toBeInTheDocument();
  });

  it("sends a consistent calendar", async () => {
    const onSave = vi.fn();
    render(<CalendarFormModal calendar={calendar} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ gradesDeadline: "2026-07-10", description: "Calendário 2026" }));
  });

  it("asks for the required dates on a new calendar", async () => {
    const onSave = vi.fn();
    render(<CalendarFormModal calendar={null} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText("Informe o prazo de lançamento de notas.")).toBeInTheDocument();
  });
});

describe("ClassFormModal", () => {
  const subjects = [{ id: 7, code: "CC101", name: "Programação" }];
  const teachers = [{ id: 3, name: "Carol Teacher" }];

  it("requires a subject and does not send", async () => {
    const onSave = vi.fn();
    render(<ClassFormModal mode="create" semesters={[semester]} subjects={subjects} teachers={teachers} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Criar turma" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText("Escolha a disciplina.")).toBeInTheDocument();
  });

  it("lets the Administration pick semester and teacher", async () => {
    const onSave = vi.fn();
    render(<ClassFormModal mode="create" semesters={[semester]} subjects={subjects} teachers={teachers} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByLabelText(/Disciplina/), "7");
    await userEvent.selectOptions(screen.getByLabelText(/Professor/), "3");
    await userEvent.click(screen.getByRole("button", { name: "Criar turma" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ semesterId: 1, subjectId: 7, teacherId: 3, seats: 30 }));
  });

  it("is a request for a teacher: no teacher or semester choice, and it must suggest a schedule", async () => {
    const onSave = vi.fn();
    render(<ClassFormModal mode="request" semesters={[semester]} subjects={subjects} teachers={[]} loading={false} onClose={vi.fn()} onSave={onSave} />);
    expect(screen.queryByLabelText(/Professor/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Semestre/)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/Disciplina/), "7");
    await userEvent.click(screen.getByRole("button", { name: "Remover horário 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText("Sugira ao menos um horário.")).toBeInTheDocument();
  });

  it("blocks overlapping schedules before the round trip", async () => {
    const onSave = vi.fn();
    render(<ClassFormModal mode="request" semesters={[semester]} subjects={subjects} teachers={[]} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByLabelText(/Disciplina/), "7");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar horário" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText("Os horários 1 e 2 se sobrepõem.")).toBeInTheDocument();
  });
});

describe("ScheduleEditor", () => {
  function Harness({ initial }: { initial: SlotDraft[] }) {
    const [slots, setSlots] = useState(initial);
    return <ScheduleEditor value={slots} onChange={setSlots} />;
  }

  it("adds and removes meetings", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar horário" }));
    expect(screen.getByLabelText("Início do horário 1")).toHaveValue("08:00");
    await userEvent.click(screen.getByRole("button", { name: "Remover horário 1" }));
    expect(screen.queryByLabelText("Início do horário 1")).not.toBeInTheDocument();
  });
});

describe("PromptModal", () => {
  it("requires a minimum amount of text", async () => {
    const onSubmit = vi.fn();
    render(<PromptModal title="Rejeitar" label="Motivo" submitLabel="Rejeitar" minLength={3} onClose={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/Motivo/), "ab");
    await userEvent.click(screen.getByRole("button", { name: "Rejeitar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText("Escreva pelo menos 3 caracteres.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Motivo/), "c");
    await userEvent.click(screen.getByRole("button", { name: "Rejeitar" }));
    expect(onSubmit).toHaveBeenCalledWith("abc");
  });

  it("asks for a date when it is a date prompt", async () => {
    const onSubmit = vi.fn();
    render(<PromptModal title="Liberar" label="Liberado até" kind="date" submitLabel="Liberar" onClose={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Liberar" }));
    expect(await screen.findByText("Informe a data.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("News", () => {
  const post: NewsView = {
    id: 1, title: "Prova", body: "Semana que vem", classId: 5, authorId: 9, authorName: "Carol", publishedAt: "2026-03-01T10:00:00Z", updatedAt: "2026-03-01T10:00:00Z",
  };

  it("offers edit and delete only where the caller says the user can", () => {
    const { rerender } = render(<NewsList items={[post]} canEdit={() => false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    rerender(<NewsList items={[post]} canEdit={() => true} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Editar Prova" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir Prova" })).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<NewsList items={[]} canEdit={() => false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Nenhum aviso")).toBeInTheDocument();
  });

  it("lets only the Administration broadcast to the whole institution", async () => {
    const classes = [{ id: 5, label: "CC101 T01" }];
    const { unmount } = render(<NewsFormModal news={null} classes={classes} canBroadcast={false} loading={false} onClose={vi.fn()} onSave={vi.fn()} />);
    const teacherSelect = screen.getByLabelText(/Destinatários/);
    expect(within(teacherSelect).queryByText("Toda a instituição")).not.toBeInTheDocument();
    unmount();

    render(<NewsFormModal news={null} classes={classes} canBroadcast loading={false} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(within(screen.getByLabelText(/Destinatários/)).getByText("Toda a instituição")).toBeInTheDocument();
  });

  it("sends the chosen class and refuses an empty notice", async () => {
    const onSave = vi.fn();
    render(<NewsFormModal news={null} classes={[{ id: 5, label: "CC101 T01" }]} canBroadcast={false} loading={false} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Título/), "Aviso");
    await userEvent.type(screen.getByLabelText(/^Aviso/), "Texto do aviso");
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(onSave).toHaveBeenCalledWith({ title: "Aviso", body: "Texto do aviso", classId: 5 });
  });
});
