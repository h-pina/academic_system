import { storage } from "@/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Downloads a file from an endpoint that needs the bearer token (reports and
 * submitted work). A plain link cannot send the header, so the file is
 * fetched and handed to the browser as a blob.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<string | null> {
  const token = storage.getToken();
  if (!token) return "Sua sessão expirou. Entre novamente.";
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return typeof body?.message === "string" ? body.message : "Não foi possível baixar o arquivo.";
    }
    const name = fileNameFrom(response.headers.get("content-disposition")) ?? fallbackName;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return null;
  } catch {
    return "Não foi possível acessar o servidor. Verifique sua conexão.";
  }
}

/** The file name of a `Content-Disposition` header, when present. */
export function fileNameFrom(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}
