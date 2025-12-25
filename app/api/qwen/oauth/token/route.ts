import { NextRequest, NextResponse } from "next/server";
import {
  QWEN_OAUTH_CLIENT_ID,
  QWEN_OAUTH_DEVICE_GRANT_TYPE,
  QWEN_OAUTH_TOKEN_ENDPOINT,
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

    const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: QWEN_OAUTH_DEVICE_GRANT_TYPE,
        client_id: QWEN_OAUTH_CLIENT_ID,
        device_code,
        code_verifier,
      }),
    });

    const payload = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Token poll failed", details: payload },
        { status: response.status }
      );
    }

    return NextResponse.json(JSON.parse(payload));
  } catch (error) {
    console.error("Qwen token poll failed", error);
    return NextResponse.json(
      { error: "Token poll failed" },
      { status: 500 }
    );
  }
}
