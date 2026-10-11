// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Avatar,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  SegmentedFilter,
  Toast,
  type Column,
} from "@/components/ui";

describe("Button and IconButton", () => {
  it("is disabled and busy while loading, and does not fire", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button", { name: "Ok" })).toHaveAttribute("type", "button");
  });

  it("gives an icon-only button its accessible name", () => {
    render(
      <IconButton label="Editar aluno">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Editar aluno" })).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("links the label, hint and error to the control", () => {
    render(
      <Field label="CPF" hint="Somente números" error="CPF inválido" required>
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByLabelText(/CPF/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAccessibleDescription("CPF inválido Somente números");
  });

  it("has no error attributes when valid", () => {
    render(
      <Field label="Nome">{(control) => <Input {...control} />}</Field>,
    );
    const input = screen.getByLabelText("Nome");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("gives each field its own id", () => {
    render(
      <>
        <Field label="A">{(control) => <Input {...control} />}</Field>
        <Field label="B">{(control) => <Input {...control} />}</Field>
      </>,
    );
    expect(screen.getByLabelText("A").id).not.toBe(screen.getByLabelText("B").id);
  });
});

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Novo aluno"
        description="Preencha os dados"
        footer={<Button onClick={() => setOpen(false)}>Concluir</Button>}
      >
        <Field label="Nome">{(control) => <Input {...control} />}</Field>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("opens as a named, described dialog and moves focus inside", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = await screen.findByRole("dialog", { name: "Novo aluno" });
    expect(dialog).toHaveAccessibleDescription("Preencha os dados");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes with Esc and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Focus is handed back on the next tick.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes with the close button and with a footer action", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Concluir" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = await screen.findByRole("dialog");

    for (let index = 0; index < 6; index++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("ConfirmDialog", () => {
  it("states the consequence and confirms or cancels", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Excluir curso"
        message="A matriz do curso também será excluída."
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Excluir curso" });
    expect(dialog).toHaveAccessibleDescription("A matriz do curso também será excluída.");

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses with Esc", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmDialog open title="Excluir" message="Tem certeza?" onConfirm={() => {}} onClose={onClose} />,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("disables confirmation while loading", () => {
    render(
      <ConfirmDialog open loading title="Excluir" message="Tem certeza?" onConfirm={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
  });
});

interface Person {
  id: number;
  name: string;
  course: string;
}

const COLUMNS: Column<Person>[] = [
  { key: "name", header: "Nome", cell: (row) => row.name },
  { key: "course", header: "Curso", cell: (row) => row.course },
];

const PEOPLE: Person[] = [
  { id: 1, name: "Erin Student", course: "Computer Science" },
  { id: 2, name: "Judy Student", course: "Mathematics" },
];

describe("DataTable", () => {
  it("renders headers and rows under an accessible name", () => {
    render(<DataTable caption="Alunos" columns={COLUMNS} rows={PEOPLE} getRowKey={(row) => row.id} />);

    const table = screen.getByRole("table", { name: "Alunos" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Nome",
      "Curso",
    ]);
    expect(within(table).getByText("Judy Student")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Alunos" })).toHaveAttribute("tabindex", "0");
  });

  it("shows skeleton rows while loading with nothing to show yet", () => {
    render(
      <DataTable caption="Alunos" columns={COLUMNS} rows={[]} loading skeletonRows={3} getRowKey={(row) => row.id} />,
    );
    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(3);
    expect(screen.queryByText("Nenhum registro encontrado.")).not.toBeInTheDocument();
  });

  it("keeps existing rows visible while reloading", () => {
    render(
      <DataTable caption="Alunos" columns={COLUMNS} rows={PEOPLE} loading getRowKey={(row) => row.id} />,
    );
    expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0);
    expect(screen.getByText("Erin Student")).toBeInTheDocument();
  });

  it("shows the default or a custom empty state", () => {
    const { rerender } = render(
      <DataTable caption="Alunos" columns={COLUMNS} rows={[]} getRowKey={(row) => row.id} />,
    );
    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();

    rerender(
      <DataTable
        caption="Alunos"
        columns={COLUMNS}
        rows={[]}
        getRowKey={(row) => row.id}
        empty={<EmptyState title="Nenhum aluno" description="Cadastre o primeiro aluno." />}
      />,
    );
    expect(screen.getByText("Cadastre o primeiro aluno.")).toBeInTheDocument();
  });

  it("activates a row with the mouse, Enter and Space", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <DataTable
        caption="Alunos"
        columns={COLUMNS}
        rows={PEOPLE}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );

    const row = screen.getByText("Erin Student").closest("tr") as HTMLElement;
    await user.click(row);
    row.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onRowClick).toHaveBeenCalledTimes(3);
    expect(onRowClick).toHaveBeenCalledWith(PEOPLE[0]);
  });

  it("does not make rows focusable without an action", () => {
    render(<DataTable caption="Alunos" columns={COLUMNS} rows={PEOPLE} getRowKey={(row) => row.id} />);
    expect(screen.getByText("Erin Student").closest("tr")).not.toHaveAttribute("tabindex");
  });
});

describe("SegmentedFilter", () => {
  const OPTIONS = [
    { value: "all", label: "Todos", count: 6 },
    { value: "active", label: "Ativos", count: 4 },
    { value: "locked", label: "Trancados" },
  ];

  function Harness({ onChange }: { onChange?: (value: string) => void }) {
    const [value, setValue] = useState("all");
    return (
      <SegmentedFilter
        label="Situação"
        options={OPTIONS}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    );
  }

  it("is a labelled radio group with one tab stop", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Situação" });
    const radios = within(group).getAllByRole("radio");

    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(radios.map((radio) => radio.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(within(group).getByText("6")).toBeInTheDocument();
  });

  it("moves and selects with the arrow keys, wrapping around", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    screen.getByRole("radio", { name: /Todos/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("active");
    expect(screen.getByRole("radio", { name: /Ativos/ })).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("locked");
  });

  it("jumps with Home and End and selects on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /Ativos/ }));
    expect(onChange).toHaveBeenLastCalledWith("active");

    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("locked");
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("all");
  });
});

describe("Avatar", () => {
  it("shows initials and exposes the name", () => {
    render(<Avatar name="Erin Student" />);
    const avatar = screen.getByRole("img", { name: "Erin Student" });
    expect(avatar).toHaveTextContent("ES");
  });
});

describe("Toast", () => {
  it("announces errors assertively and dismisses", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast type="ERROR" messages={["Já existe um usuário com este CPF"]} onDismiss={onDismiss} />);

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
    expect(toast).toHaveTextContent("Já existe um usuário com este CPF");

    await user.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("announces success politely", () => {
    render(<Toast type="SUCCESS" messages={["Aluno cadastrado."]} onDismiss={() => {}} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
