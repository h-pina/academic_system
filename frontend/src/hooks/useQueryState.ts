"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseQueryState, serializeQueryState, type QueryState } from "@/lib/queryState";

/**
 * List state (search, filters, page, sort) mirrored in the URL query string.
 * The URL is read once on mount, then written with `replaceState` as the
 * state changes, so a reload or a shared link reproduces the list without
 * filling the browser history.
 */
export function useQueryState<T extends QueryState>(defaults: T) {
  const defaultsRef = useRef(defaults);
  const [state, setState] = useState<T>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(parseQueryState(window.location.search, defaultsRef.current) as T);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const query = serializeQueryState(state, defaultsRef.current);
    const url = `${window.location.pathname}${query}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", url);
  }, [state, ready]);

  const update = useCallback((patch: Partial<T>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  return { state, update, ready };
}
