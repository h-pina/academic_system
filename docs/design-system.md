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

## Status

The tokens, themes, fonts and brand mark are in place. The component library
(task 15), per-profile navigation (16), application shell (17) and migration of
every screen (18) build on this base; until then the legacy components keep
working because the Tailwind `slate`, state and `brand` scales are remapped to
the tokens.
