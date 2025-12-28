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

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ollama API key is required" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const baseUrl = getBaseUrl(request);
  const targetUrl = `${baseUrl}${API_PREFIX}/chat`;

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.text();
      return NextResponse.json(
        { error: "Ollama chat request failed", details: payload },
        { status: response.status }
      );
    }

    // If stream is requested, pipe the response body
    if (body.stream) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Ollama chat proxy failed", error);
    return NextResponse.json(
      { error: "Ollama chat request failed" },
      { status: 500 }
    );
  }
}
