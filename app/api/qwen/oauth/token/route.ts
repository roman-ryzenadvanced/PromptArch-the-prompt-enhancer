import { NextRequest, NextResponse } from "next/server";
import {
  QWEN_OAUTH_CLIENT_ID,
  QWEN_OAUTH_DEVICE_GRANT_TYPE,
  QWEN_OAUTH_TOKEN_ENDPOINT,
  createQwenHeaders,
} from "../../constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { device_code, code_verifier } = body || {};

    if (!device_code || !code_verifier) {
      return NextResponse.json(
        { error: "device_code and code_verifier are required" },
        { status: 400 }
      );
    }

    console.log(`[Qwen Token Poll] Calling ${QWEN_OAUTH_TOKEN_ENDPOINT} for device_code: ${device_code.slice(0, 8)}...`);

    const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: createQwenHeaders("application/x-www-form-urlencoded"),
      body: new URLSearchParams({
        grant_type: QWEN_OAUTH_DEVICE_GRANT_TYPE,
        client_id: QWEN_OAUTH_CLIENT_ID,
        device_code,
        code_verifier,
      }),
    });

    const payload = await response.text();
    console.log(`[Qwen Token Poll] Response status: ${response.status}`);

    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      console.error(`[Qwen Token Poll] Failed to parse response: ${payload}`);
      data = { error: payload || "Unknown error from Qwen" };
    }

    if (data.error && data.error !== "authorization_pending") {
      console.warn(`[Qwen Token Poll] Error in response:`, data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Qwen token poll failed", error);
    return NextResponse.json(
      { error: "internal_server_error", message: error instanceof Error ? error.message : "Token poll failed" },
      { status: 500 }
    );
  }
}
