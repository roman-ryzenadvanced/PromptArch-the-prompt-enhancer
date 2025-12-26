import { NextRequest, NextResponse } from "next/server";
import { QWEN_OAUTH_BASE_URL, createQwenHeaders } from "../constants";

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
        ...createQwenHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || "Failed to fetch user info" };
      }
      return NextResponse.json(errorData, { status: userResponse.status });
    }

    const userData = await userResponse.json();
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("Qwen user info failed", error);
    return NextResponse.json(
      { error: "internal_server_error", message: error instanceof Error ? error.message : "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
