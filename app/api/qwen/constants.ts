export const QWEN_OAUTH_BASE_URL = "https://chat.qwen.ai";
export const QWEN_OAUTH_DEVICE_CODE_ENDPOINT = `${QWEN_OAUTH_BASE_URL}/api/v1/oauth2/device/code`;
export const QWEN_OAUTH_TOKEN_ENDPOINT = `${QWEN_OAUTH_BASE_URL}/api/v1/oauth2/token`;
export const QWEN_OAUTH_CLIENT_ID = "f0304373b74a44d2b584a3fb70ca9e56";
export const QWEN_OAUTH_SCOPE = "openid profile email model.completion";
export const QWEN_OAUTH_DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

export const QWEN_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function createQwenHeaders(contentType?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": QWEN_USER_AGENT,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}
