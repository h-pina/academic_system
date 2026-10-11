"use client";

import { useCallback } from "react";
import { useLoading } from "@/context/LoadingContext";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { storage } from "@/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TIMEOUT_MS = 60_000;

export interface RequestOptions extends RequestInit {
  auth?: boolean;
  silent?: boolean;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: null; error: string };

export function useApi() {
  const { showMessage } = useMessage();
  const { startLoading, stopLoading } = useLoading();
  const { actions } = useUser();

  const request = useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> => {
      const { auth = true, silent = false, ...init } = options;

      const fail = (error: string): ApiResult<T> => {
        if (!silent) showMessage({ type: "ERROR", messages: [error] });
        return { ok: false, data: null, error };
      };

      const headers = new Headers(init.headers);
      if (init.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      if (auth) {
        const token = storage.getToken();
        if (!token) {
          actions.clearUser();
          if (typeof window !== "undefined") window.location.href = "/login";
          return fail("Your session has expired. Please sign in again.");
        }
        headers.set("Authorization", `Bearer ${token.trim()}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      startLoading();

      try {
        const response = await fetch(`${API_URL}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.status === 401 && auth) {
          showMessage({
            type: "ERROR",
            messages: ["Your session has expired. Please sign in again."],
          });
          setTimeout(() => {
            actions.clearUser();
            if (typeof window !== "undefined") window.location.href = "/login";
          }, 1500);
          return { ok: false, data: null, error: "Unauthorized" };
        }

        const raw = await response.text();
        let body: unknown = null;
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
        }

        if (!response.ok) {
          return fail(extractErrorMessage(body, response.status));
        }

        return { ok: true, data: body as T };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === "AbortError") {
          return fail(
            "The server took too long to respond. Please check your connection and try again.",
          );
        }
        return fail(
          "Could not reach the server. Please check that you are online.",
        );
      } finally {
        stopLoading();
      }
    },
    [showMessage, startLoading, stopLoading, actions],
  );

  return { request };
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  if (typeof body === "string" && body) return body;
  return `Server error (${status})`;
}
