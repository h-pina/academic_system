# Design system (direction "Campus")

Visual identity of the web client: ultramarine brand colour with coral, sun and
mint accents, generously rounded shapes, Bricolage Grotesque for headings and
DM Sans for text, in light and dark themes.

## Where things live

| What | File |
|------|------|
| Token values (colours, radii, shadow) | `frontend/src/styles/tokens.ts` |
| Tailwind mapping and CSS variable output | `frontend/tailwind.config.ts` |
| Global base styles (fonts, focus ring, transitions) | `frontend/src/app/globals.css` |
| Theme logic (preference, resolution, no-flash script) | `frontend/src/lib/theme.ts` |
| Theme provider and toggle | `frontend/src/context/ThemeContext.tsx`, `frontend/src/components/ThemeToggle.tsx` |
| Brand mark | `frontend/src/components/BrandMark.tsx` |

## Tokens

Values are defined once in `tokens.ts` and emitted as CSS variables by a
Tailwind plugin. Components use Tailwind classes; they never hold colour
literals.

| Token group | Tailwind classes | Notes |
|-------------|------------------|-------|
| `brand` 50..900 | `bg-brand-600`, `text-brand-700` | Ultramarine. 600 is the solid action colour; 700 is link/text on a brand tint |
| `slate` 50..900 | `text-slate-900`, `border-slate-200` | Neutral ramp tinted toward the brand. In dark it is inverted, so existing `slate-*` classes adapt by themselves |
| `red`, `amber`, `emerald` 50..900 | `bg-red-50`, `text-amber-900` | States. In dark the tints become deep tints and 800/900 become light text; 500 to 700 stay solid |
| `canvas`, `surface` | `bg-canvas`, `bg-surface` | Page background and raised surfaces (cards, header, inputs) |
| `coral`, `sun`, `mint` | `bg-coral`, `text-mint` | Accents |
| `tileBlue`, `tileCoral`, `tileSun`, `tileMint` | `bg-tile-blue` | Dashboard indicator backgrounds |
| `ink`, `muted`, `line` | `text-ink`, `text-muted`, `border-line` | Semantic aliases of slate 900, 600 and 200 |

Shape and elevation:

| Token | Value | Class |
|-------|-------|-------|
| `--radius-control` | 12px | `rounded-lg` (inputs, buttons) |
| `--radius-surface` | 16px | `rounded-xl` (cards) |
| `--radius-overlay` | 22px | `rounded-2xl` (modals) |
| shadows | `card`, `panel`, `focus` | `shadow-card`, `shadow-panel`, `shadow-focus` |

Typography: `font-sans` (DM Sans) for text; `font-display` (Bricolage
Grotesque) for headings. `h1` to `h3` use the display face by default.

## Themes

- Light is the default. Dark follows the operating system.
- The user can choose light, dark or system with the toggle in the header and
  on the login screen. An explicit choice is stored in `localStorage`
  (`@academic:theme`) and applied as `data-theme` on `<html>`; "system" removes
  the attribute and the CSS follows `prefers-color-scheme`.
- A small inline script in `<head>` applies a stored choice before the first
  paint, so the page never flashes the wrong theme.

## Changing the look

Edit a value in `tokens.ts`; both themes and every screen follow. Contrast is
guarded by `src/styles/tokens.test.ts` (WCAG AA for text, links, solid
buttons, state tints and dashboard tiles), so a change that makes text
unreadable fails the tests.

## Components

Everything lives in `frontend/src/components/ui/` and is imported from
`@/components/ui`. A live catalogue of every component and state is at
`/app/design` (development only).

| Component | Use |
|-----------|-----|
| `Button`, `IconButton` | Actions. `IconButton` requires a `label`, which becomes its accessible name |
| `Field` + `Input`, `Select`, `Textarea`, `Checkbox` | Form controls. `Field` links label, hint and error through ids and ARIA |
| `Modal`, `ConfirmDialog` | Dialogs on the Radix dialog primitive: focus trap, Esc, focus returned to the opener |
| `DataTable` | Declarative columns, sticky header, keyboard-reachable scroll, skeleton and empty states, optional row action |
| `Badge`, `Avatar`, `StatTile`, `SegmentedFilter` | State pills, initials, indicators, single-choice filter (radio group with arrow keys) |
| `Toast`, `EmptyState`, `Skeleton`, `Pagination` | Messages, empty lists, loading placeholders, paging |

Rules of thumb: wire every control through `Field`; give every icon-only
control a label; show state in text as well as colour; never hard-code colours.

## Application shell

`frontend/src/components/shell/` holds the frame of every signed-in screen
(`AppShell`): a skip link, the top bar (menu button, brand, theme toggle,
user menu), the sidebar, breadcrumbs and the content area.

- **Sidebar.** Icon and label, grouped by purpose. On wide screens (1024px
  and up) it collapses to an icon rail; the choice is remembered
  (`@academic:sidebar`). On small screens it becomes a drawer opened from the
  menu button, with focus trapped and Esc to close.
- **Top bar.** The user menu holds "Meus dados", "Atalhos de teclado" and
  "Sair".
- **Breadcrumbs.** Module, then nested page (for example Cursos e matrizes >
  Matriz curricular); identifiers are skipped.
- **Keyboard.** `/` focuses the page's search field, `M` opens or collapses
  the menu; neither fires while typing or with a modifier key. After a
  client-side navigation focus moves to the content, so screen readers announce
  the new page. The first tab stop is "Ir para o conteúdo".
- **Landmarks.** `header`, `nav` (Módulos), `aside` (Navegação) and `main`.

Pure logic (sidebar state, active item, breadcrumbs, shortcuts) is in
`frontend/src/lib/shell.ts` and is unit-tested.

## Status

Tokens, themes, fonts, brand mark, the component library, per-profile
navigation, the application shell and every screen are on the library. No
screen uses legacy CSS or hand-made modals. Polish that remains is the scope of
task 19 (field-level API errors, filters in the URL, sorting) and the browser
suite of task 20.
