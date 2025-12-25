export const DEFAULT_OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || process.env.OLLAMA_ENDPOINT || "https://ollama.com";
export function normalizeOllamaBase(url?: string): string {
  if (!url) return DEFAULT_OLLAMA_BASE.replace(/\/$/, "");
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_OLLAMA_BASE.replace(/\/$/, "");
  return trimmed.replace(/\/$/, "");
}
