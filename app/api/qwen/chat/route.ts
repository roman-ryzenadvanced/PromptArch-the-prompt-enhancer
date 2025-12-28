import { NextRequest, NextResponse } from "next/server";
import { createQwenHeaders } from "../constants";

const DEFAULT_QWEN_ENDPOINT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

function normalizeEndpoint(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return DEFAULT_QWEN_ENDPOINT;
  }

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/\/$/, "");
  return `${cleaned}/chat/completions`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { endpoint, model, messages, stream } = body || {};
    const authorization = request.headers.get("authorization") || body?.authorization;

    if (!authorization) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const url = normalizeEndpoint(endpoint);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...createQwenHeaders("application/json"),
        Authorization: authorization,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      return NextResponse.json(
        { error: payload || response.statusText || "Qwen chat failed" },
        { status: response.status }
      );
    }

    // Handle streaming
    if (stream) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "internal_server_error", message: error instanceof Error ? error.message : "Qwen chat failed" },
      { status: 500 }
    );
  }
}
