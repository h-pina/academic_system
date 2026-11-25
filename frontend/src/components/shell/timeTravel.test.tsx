// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthCalendar from "@/components/shell/MonthCalendar";
import TimeTravelPanel from "@/components/shell/TimeTravelPanel";

const targets = [
  { label: "Fim das inscrições", date: "2026-02-21" },
  { label: "Depois do prazo de notas", date: "2026-07-11" },
];
const markers = { "2026-02-20": [{ label: "Último dia das inscrições" }] };

const setup = (props: Partial<Parameters<typeof TimeTravelPanel>[0]> = {}) => {
  const onTravel = vi.fn();
  const onReset = vi.fn();
  render(
    <TimeTravelPanel today="2026-02-10" simulated={false} canControl targets={targets} markers={markers} onTravel={onTravel} onReset={onReset} {...props} />,
  );
  return { onTravel, onReset };
};
const open = () => userEvent.click(screen.getByRole("button", { name: "Viagem no tempo" }));

describe("TimeTravelPanel", () => {
  it("shows nothing where time travel is off and the date is real", () => {
    setup({ canControl: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("warns while the date is simulated, even where the controls are off", async () => {
    setup({ canControl: false, simulated: true });
    await userEvent.click(screen.getByRole("button", { name: /Data simulada: 10\/02\/2026/ }));
    expect(screen.queryByRole("region", { name: "Viagem no tempo" })).not.toBeInTheDocument();
  });

  it("opens a calendar on the current month for any user", async () => {
    setup();
    await open();
    expect(screen.getByRole("region", { name: "Viagem no tempo" })).toBeInTheDocument();
    expect(screen.getByText("fevereiro de 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^10 de fevereiro de 2026, dia atual do sistema/ })).toBeInTheDocument();
  });

  it("travels to the day picked on the calendar", async () => {
    const { onTravel } = setup();
    await open();
    const go = screen.getByRole("button", { name: /^Ir para 10\/02\/2026/ });
    expect(go).toBeDisabled(); // already there
    await userEvent.click(screen.getByRole("button", { name: /^25 de fevereiro de 2026/ }));
    await userEvent.click(screen.getByRole("button", { name: "Ir para 25/02/2026" }));
    expect(onTravel).toHaveBeenCalledWith({ date: "2026-02-25" });
  });

  it("changes the month before picking", async () => {
    const { onTravel } = setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("março de 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^5 de março de 2026/ }));
    await userEvent.click(screen.getByRole("button", { name: "Ir para 05/03/2026" }));
    expect(onTravel).toHaveBeenCalledWith({ date: "2026-03-05" });
  });

  it("announces the deadlines marked on the calendar", async () => {
    setup();
    await open();
    expect(screen.getByRole("button", { name: /^20 de fevereiro de 2026, Último dia das inscrições/ })).toBeInTheDocument();
  });

  it("moves by days", async () => {
    const { onTravel } = setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "+7 dias" }));
    await userEvent.click(screen.getByRole("button", { name: "−1 dia" }));
    expect(onTravel).toHaveBeenNthCalledWith(1, { days: 7 });
    expect(onTravel).toHaveBeenNthCalledWith(2, { days: -1 });
  });

  it("jumps to the day after a deadline", async () => {
    const { onTravel } = setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: /Fim das inscrições \(21\/02\/2026\)/ }));
    expect(onTravel).toHaveBeenCalledWith({ date: "2026-02-21" });
  });

  it("offers the way back only while simulated", async () => {
    setup();
    await open();
    expect(screen.queryByRole("button", { name: "Voltar ao tempo real" })).not.toBeInTheDocument();
  });

  it("goes back to the real time", async () => {
    const { onReset } = setup({ simulated: true });
    await userEvent.click(screen.getByRole("button", { name: /Data simulada/ }));
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao tempo real" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("works without deadline shortcuts", async () => {
    setup({ targets: [], markers: {} });
    await open();
    expect(screen.queryByRole("button", { name: /Fim das inscrições/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+1 dia" })).toBeInTheDocument();
  });
});

describe("MonthCalendar", () => {
  it("marks the chosen day as pressed and reports the picked one", async () => {
    const onSelect = vi.fn();
    render(<MonthCalendar value="2026-03-09" today="2026-03-01" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /^9 de março de 2026/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /^31 de março de 2026/ }));
    expect(onSelect).toHaveBeenCalledWith("2026-03-31");
  });

  it("goes back across the year boundary", async () => {
    render(<MonthCalendar value="2026-01-15" today="2026-01-15" onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("dezembro de 2025")).toBeInTheDocument();
  });

  it("lists the weekdays for screen readers", () => {
    render(<MonthCalendar value="2026-03-09" today="2026-03-09" onSelect={vi.fn()} />);
    expect(screen.getByText("domingo")).toBeInTheDocument();
    expect(screen.getByText("sábado")).toBeInTheDocument();
  });
});
