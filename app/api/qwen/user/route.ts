import { NextRequest, NextResponse } from "next/server";
import { QWEN_OAUTH_BASE_URL } from "../constants";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }
    const token = authorization.slice(7);

    const userResponse = await fetch(`${QWEN_OAUTH_BASE_URL}/api/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      return NextResponse.json(
        { error: "Failed to fetch user info", details: errorText },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("Qwen user info failed", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
