// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useListState } from "@/hooks/useListState";

const DEFAULTS = { q: "", status: "" };
const SORT_FIELDS = ["name", "entryYear"];

function setUrl(search: string) {
  window.history.replaceState(null, "", `/app/students${search}`);
}

beforeEach(() => setUrl(""));

describe("useListState", () => {
  it("starts from the defaults when the URL has no state", async () => {
    const { result } = renderHook(() => useListState(DEFAULTS, SORT_FIELDS));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.page).toBe(1);
    expect(result.current.sort).toEqual({ field: undefined, order: "asc" });
    expect(result.current.isFiltered).toBe(false);
  });

  it("restores filters, page and sort from the URL", async () => {
    setUrl("?q=ana&status=locked&page=3&sort=entryYear&order=desc");
    const { result } = renderHook(() => useListState(DEFAULTS, SORT_FIELDS));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.filters).toEqual({ q: "ana", status: "locked" });
    expect(result.current.page).toBe(3);
    expect(result.current.sort).toEqual({ field: "entryYear", order: "desc" });
    expect(result.current.isFiltered).toBe(true);
  });

  it("writes changes back to the URL, omitting defaults", async () => {
    const { result } = renderHook(() => useListState(DEFAULTS, SORT_FIELDS));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.setFilter("status", "active"));
    await waitFor(() => expect(window.location.search).toBe("?status=active"));

    act(() => result.current.setPage(2));
    await waitFor(() => expect(window.location.search).toBe("?status=active&page=2"));
  });

  it("returns to the first page when a filter or the sort changes", async () => {
    setUrl("?page=4");
    const { result } = renderHook(() => useListState(DEFAULTS, SORT_FIELDS));
    await waitFor(() => expect(result.current.page).toBe(4));

    act(() => result.current.setFilter("q", "maria"));
    await waitFor(() => expect(result.current.page).toBe(1));

    act(() => result.current.setPage(5));
    await waitFor(() => expect(result.current.page).toBe(5));
    act(() => result.current.setSort({ field: "name", order: "desc" }));
    await waitFor(() => expect(result.current.page).toBe(1));
    expect(window.location.search).toContain("sort=name");
    expect(window.location.search).toContain("order=desc");
  });

  it("ignores an unknown sort field in the URL", async () => {
    setUrl("?sort=passwordHash&order=desc");
    const { result } = renderHook(() => useListState(DEFAULTS, SORT_FIELDS));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.sort.field).toBeUndefined();
    expect(result.current.requestParams.sort).toBeUndefined();
  });

  it("sends the sort to the request only when one is chosen", async () => {
    const { result } = renderHook(() => useListState(DEFAULTS, SORT_FIELDS));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.requestParams).toMatchObject({ sort: undefined, order: undefined });

    act(() => result.current.setSort({ field: "name", order: "desc" }));
    await waitFor(() =>
      expect(result.current.requestParams).toMatchObject({ sort: "name", order: "desc" }),
    );
  });
});
