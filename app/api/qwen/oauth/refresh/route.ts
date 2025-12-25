import { NextRequest, NextResponse } from "next/server";
import { QWEN_OAUTH_CLIENT_ID, QWEN_OAUTH_TOKEN_ENDPOINT } from "../../constants";

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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: QWEN_OAUTH_CLIENT_ID,
      }),
    });

    const payload = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Token refresh failed", details: payload },
        { status: response.status }
      );
    }

    return NextResponse.json(JSON.parse(payload));
  } catch (error) {
    console.error("Qwen token refresh failed", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
