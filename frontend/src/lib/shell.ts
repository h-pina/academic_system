import { resolvePageTitle } from "@/lib/access";

/** Pure logic of the application shell (sidebar state, active item, crumbs, shortcuts). */

export const SIDEBAR_STORAGE_KEY = "@academic:sidebar";
export type SidebarState = "expanded" | "collapsed";

/** Anything other than an explicit "collapsed" means expanded. */
export function parseSidebarState(raw: string | null | undefined): SidebarState {
  return raw === "collapsed" ? "collapsed" : "expanded";
}

export function toggleSidebarState(state: SidebarState): SidebarState {
  return state === "collapsed" ? "expanded" : "collapsed";
}

/** Is `/app/<route>` (or anything below it) the current page? */
export function isActiveRoute(pathname: string, route: string): boolean {
  const href = `/app/${route}`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface Crumb {
  label: string;
  /** Absent on the current page. */
  href?: string;
}

const NESTED_LABELS: Record<string, string> = {
  curriculum: "Matriz curricular",
};

/**
 * Breadcrumbs for a path under `/app`: the module, then any named nested
 * page. Identifiers (`/courses/3/...`) are skipped. The home page has none.
 */
export function buildBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app" || segments.length < 2) return [];

  const [, route, ...rest] = segments;
  const nested = rest
    .map((segment) => NESTED_LABELS[segment])
    .filter((label): label is string => Boolean(label));

  const root: Crumb = { label: resolvePageTitle(route) };
  if (nested.length === 0) return [root];

  return [
    { ...root, href: `/app/${route}` },
    ...nested.map((label, index) =>
      index === nested.length - 1 ? { label } : { label, href: undefined },
    ),
  ];
}

export type ShortcutAction = "focus-search" | "toggle-menu";

interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

interface TargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

/** True when the focused element expects typed text. */
export function isTypingTarget(target: TargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

/**
 * Keyboard shortcuts: `/` focuses the search field, `m` toggles the menu.
 * They never fire while typing or with a modifier held.
 */
export function resolveShortcut(
  event: KeyEventLike,
  target: TargetLike | null | undefined,
): ShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(target)) return null;

  if (event.key === "/") return "focus-search";
  if (event.key === "m" || event.key === "M") return "toggle-menu";
  return null;
}
