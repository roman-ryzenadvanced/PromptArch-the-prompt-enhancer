import { NextRequest, NextResponse } from "next/server";
import {
  QWEN_OAUTH_CLIENT_ID,
  QWEN_OAUTH_TOKEN_ENDPOINT,
  createQwenHeaders,
} from "../../constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { refresh_token } = body || {};

    if (!refresh_token) {
      return NextResponse.json(
        { error: "refresh_token is required" },
        { status: 400 }
      );
    }

    const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: createQwenHeaders("application/x-www-form-urlencoded"),
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: QWEN_OAUTH_CLIENT_ID,
      }),
    });

    const payload = await response.text();
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      data = { error: payload || "Unknown error from Qwen" };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Qwen token refresh failed", error);
    return NextResponse.json(
      { error: "internal_server_error", message: error instanceof Error ? error.message : "Token refresh failed" },
      { status: 500 }
    );
  }
}
