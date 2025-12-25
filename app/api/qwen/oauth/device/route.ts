import { NextRequest, NextResponse } from "next/server";
import {
  QWEN_OAUTH_CLIENT_ID,
  QWEN_OAUTH_DEVICE_CODE_ENDPOINT,
  QWEN_OAUTH_SCOPE,
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

    const response = await fetch(QWEN_OAUTH_DEVICE_CODE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: QWEN_OAUTH_CLIENT_ID,
        scope: QWEN_OAUTH_SCOPE,
        code_challenge,
        code_challenge_method,
      }),
    });

    const payload = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Device authorization failed", details: payload },
        { status: response.status }
      );
    }

    return NextResponse.json(JSON.parse(payload));
  } catch (error) {
    console.error("Qwen device authorization failed", error);
    return NextResponse.json(
      { error: "Device authorization failed" },
      { status: 500 }
    );
  }
}
