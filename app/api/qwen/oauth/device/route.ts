import { NextRequest, NextResponse } from "next/server";
import {
  QWEN_OAUTH_CLIENT_ID,
  QWEN_OAUTH_DEVICE_CODE_ENDPOINT,
  QWEN_OAUTH_SCOPE,
  createQwenHeaders,
} from "../../constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code_challenge, code_challenge_method } = body || {};

    if (!code_challenge || !code_challenge_method) {
      return NextResponse.json(
        { error: "code_challenge and code_challenge_method are required" },
        { status: 400 }
      );
    }

    console.log(`[Qwen Device Auth] Calling ${QWEN_OAUTH_DEVICE_CODE_ENDPOINT}...`);

    const response = await fetch(QWEN_OAUTH_DEVICE_CODE_ENDPOINT, {
      method: "POST",
      headers: createQwenHeaders("application/x-www-form-urlencoded"),
      body: new URLSearchParams({
        client_id: QWEN_OAUTH_CLIENT_ID,
        scope: QWEN_OAUTH_SCOPE,
        code_challenge,
        code_challenge_method,
      }),
    });

    const payload = await response.text();
    console.log(`[Qwen Device Auth] Response status: ${response.status}`);

    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      console.error(`[Qwen Device Auth] Failed to parse response: ${payload}`);
      data = { error: payload || "Unknown error from Qwen" };
    }

    if (!response.ok) {
      console.warn(`[Qwen Device Auth] Error response:`, data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Qwen device authorization failed", error);
    return NextResponse.json(
      { error: "internal_server_error", message: error instanceof Error ? error.message : "Device authorization failed" },
      { status: 500 }
    );
  }
}
