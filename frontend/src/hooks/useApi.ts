"use client";

import { useCallback } from "react";
import { useLoading } from "@/context/LoadingContext";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { hasFieldErrors, toFieldErrors, type FieldErrors } from "@/lib/fieldErrors";
import { storage } from "@/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TIMEOUT_MS = 60_000;

export interface RequestOptions extends RequestInit {
  auth?: boolean;
  silent?: boolean;
  /**
   * Hand validation errors back keyed by field instead of raising a toast,
   * for forms that mark each field. Other failures still raise a toast.
   */
  fieldErrors?: boolean;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: null; error: string; fieldErrors?: FieldErrors };

export function useApi() {
  const { showMessage } = useMessage();
  const { startLoading, stopLoading } = useLoading();
  const { actions } = useUser();

  const request = useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> => {
      const { auth = true, silent = false, fieldErrors = false, ...init } = options;

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
          return fail("Sua sessão expirou. Entre novamente.");
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
            messages: ["Sua sessão expirou. Entre novamente."],
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
          if (fieldErrors && body && typeof body === "object" && "errors" in body) {
            const mapped = toFieldErrors((body as { errors: unknown }).errors);
            if (hasFieldErrors(mapped)) {
              return {
                ok: false,
                data: null,
                error: extractErrorMessage(body, response.status),
                fieldErrors: mapped,
              };
            }
          }
          return fail(extractErrorMessage(body, response.status));
        }

        return { ok: true, data: body as T };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === "AbortError") {
          return fail(
            "O servidor demorou para responder. Verifique sua conexão e tente novamente.",
          );
        }
        return fail(
          "Não foi possível acessar o servidor. Verifique sua conexão.",
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
  return `Erro no servidor (${status})`;
}
