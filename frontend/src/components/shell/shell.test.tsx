// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppShell from "@/components/shell/AppShell";
import Breadcrumbs from "@/components/shell/Breadcrumbs";
import SideNav from "@/components/shell/SideNav";
import { ThemeProvider } from "@/context/ThemeContext";
import { buildNavigation } from "@/lib/access";
import { SIDEBAR_STORAGE_KEY } from "@/lib/shell";

let pathname = "/app";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

const USER = { name: "Alice Admin", roleLabel: "Administrador" };
const SECTIONS = buildNavigation(["secretary"]);

function renderShell(props: Partial<React.ComponentProps<typeof AppShell>> = {}) {
  return render(
    <ThemeProvider>
      <AppShell sections={SECTIONS} user={USER} onSignOut={() => {}} {...props}>
        <input type="search" aria-label="Buscar" />
        <p>Conteúdo da página</p>
      </AppShell>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  pathname = "/app/students";
  window.localStorage.clear();
  setViewport(true);
});

describe("SideNav", () => {
  it("lists grouped modules and marks the active one", () => {
    render(<SideNav sections={SECTIONS} pathname="/app/courses/3/curriculum" />);

    const nav = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(nav).getByText("Pessoas")).toBeInTheDocument();
    expect(within(nav).getByText("Estrutura acadêmica")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Cursos e matrizes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Alunos" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps accessible names when collapsed to icons", () => {
    render(<SideNav sections={SECTIONS} pathname="/app" collapsed />);

    expect(screen.queryByText("Pessoas")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Alunos" });
    expect(link).toHaveAttribute("title", "Alunos");
    expect(link).toHaveAttribute("href", "/app/students");
  });

  it("says so when there are no modules", () => {
    render(<SideNav sections={[]} pathname="/app" />);
    expect(screen.getByText("Seu perfil não tem módulos disponíveis.")).toBeInTheDocument();
  });
});

describe("Breadcrumbs", () => {
  it("links the parent and marks the current page", () => {
    render(
      <Breadcrumbs
        crumbs={[
          { label: "Cursos e matrizes", href: "/app/courses" },
          { label: "Matriz curricular" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Cursos e matrizes" })).toHaveAttribute(
      "href",
      "/app/courses",
    );
    expect(screen.getByText("Matriz curricular")).toHaveAttribute("aria-current", "page");
  });

  it("renders nothing without crumbs", () => {
    const { container } = render(<Breadcrumbs crumbs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AppShell on a wide screen", () => {
  it("offers a skip link and landmarks", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute(
      "href",
      "#content",
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "content");
    expect(screen.getByRole("complementary", { name: "Navegação" })).toBeInTheDocument();
  });

  it("collapses to icons, remembers the choice, and expands again", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Recolher menu" }));
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("collapsed");
    expect(screen.queryByText("Pessoas")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expandir menu" }));
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("expanded");
    expect(screen.getByText("Pessoas")).toBeInTheDocument();
  });

  it("restores a collapsed sidebar", async () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "collapsed");
    renderShell();

    expect(await screen.findByRole("button", { name: "Expandir menu" })).toBeInTheDocument();
    expect(screen.queryByText("Pessoas")).not.toBeInTheDocument();
  });

  it("focuses the search field with / and toggles the menu with m", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.keyboard("/");
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveFocus();

    // Typing "m" in the field must not toggle the menu.
    await user.keyboard("m");
    expect(screen.getByRole("button", { name: "Recolher menu" })).toBeInTheDocument();

    (document.activeElement as HTMLElement).blur();
    await user.keyboard("m");
    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument();
  });

  it("opens the user menu with their data, shortcuts and sign out", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    renderShell({ onSignOut });

    await user.click(screen.getByRole("button", { name: "Menu de Alice Admin" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Meus dados/ })).toHaveAttribute(
      "href",
      "/app/profile",
    );

    await user.click(within(menu).getByRole("menuitem", { name: /Sair/ }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("lists the keyboard shortcuts", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu de Alice Admin" }));
    await user.click(await screen.findByRole("menuitem", { name: /Atalhos de teclado/ }));

    const dialog = await screen.findByRole("dialog", { name: "Atalhos de teclado" });
    expect(within(dialog).getByText("Ir para o campo de busca da página")).toBeInTheDocument();
  });
});

describe("AppShell on a small screen", () => {
  beforeEach(() => setViewport(false));

  it("hides the sidebar and opens the navigation as a drawer", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("link", { name: "Alunos" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the drawer after choosing a module", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const drawer = await screen.findByRole("dialog");
    await user.click(within(drawer).getByRole("link", { name: "Professores" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("AppShell without modules", () => {
  it("has no menu button or sidebar for a person without profile", () => {
    renderShell({ sections: null });

    expect(
      screen.queryByRole("button", { name: /(abrir|recolher|expandir) menu/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });
});
