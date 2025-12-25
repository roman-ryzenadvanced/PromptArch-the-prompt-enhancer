import { NextRequest, NextResponse } from "next/server";
import { normalizeOllamaBase, DEFAULT_OLLAMA_BASE } from "../constants";

const API_PREFIX = "/api";

function getApiKey(request: NextRequest): string | null {
  return request.headers.get("x-ollama-api-key");
}

function getBaseUrl(request: NextRequest): string {
  const header = request.headers.get("x-ollama-endpoint");
  if (header && header.trim().length > 0) {
    return normalizeOllamaBase(header);
  }
  return DEFAULT_OLLAMA_BASE;
}

async function fetchModelNames(url: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${url}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Failed to parse");
    throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
  }

  const json = await response.json().catch(() => null);
  const candidates = Array.isArray(json?.models)
    ? json.models
    : Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
    ? json
    : [];

  const names: string[] = [];
  for (const entry of candidates) {
    if (!entry) continue;
    const name = entry.name || entry.model || entry.id;
    if (typeof name === "string" && name.length > 0) {
      names.push(name);
    }
  }

  return names;
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ollama API key is required" },
      { status: 401 }
    );
  }

  const baseUrl = getBaseUrl(request);
  const primaryUrl = `${baseUrl}${API_PREFIX}/v1/models`;
  const fallbackUrl = `${baseUrl}${API_PREFIX}/tags`;

  try {
    const primaryModels = await fetchModelNames(primaryUrl, apiKey);
    if (primaryModels.length > 0) {
      return NextResponse.json({ models: primaryModels });
    }
  } catch (error) {
    console.warn("[Ollama] Primary model fetch failed:", error);
  }

  try {
    const fallbackModels = await fetchModelNames(fallbackUrl, apiKey);
    if (fallbackModels.length > 0) {
      return NextResponse.json({ models: fallbackModels });
    }
  } catch (error) {
    console.warn("[Ollama] Fallback model fetch failed:", error);
  }

  return NextResponse.json(
    { models: [] },
    { status: 502 }
  );
}
