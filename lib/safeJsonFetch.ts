export class NonJsonResponseError extends Error {
    status: number;
    contentType: string | null;
    bodyPreview: string;

    constructor(args: { status: number; contentType: string | null; bodyPreview: string }) {
        super(`Expected JSON but received ${args.contentType ?? "unknown content-type"} (HTTP ${args.status})`);
        this.name = "NonJsonResponseError";
        this.status = args.status;
        this.contentType = args.contentType;
        this.bodyPreview = args.bodyPreview;
    }
}

type SafeJsonFetchResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: { message: string; status?: number; bodyPreview?: string } };

export async function safeJsonFetch<T>(
    url: string,
    init?: RequestInit
): Promise<SafeJsonFetchResult<T>> {
    const res = await fetch(url, init);

    const contentType = res.headers.get("content-type");
    const text = await res.text();

    // HTTP error — return readable details (don't JSON.parse blindly)
    if (!res.ok) {
        // Try JSON first if it looks like JSON
        if (contentType?.includes("application/json")) {
            try {
                const parsed = JSON.parse(text);
                return { ok: false, error: { message: parsed?.error ?? "Request failed", status: res.status } };
            } catch {
                // fall through to generic
            }
        }
        return {
            ok: false,
            error: {
                message: `Request failed (HTTP ${res.status})`,
                status: res.status,
                bodyPreview: text.slice(0, 300),
            },
        };
    }

    // Success but not JSON => this is exactly the "Unexpected token <" case
    if (!contentType?.includes("application/json")) {
        return {
            ok: false,
            error: {
                message: `Server returned non-JSON (content-type: ${contentType ?? "unknown"})`,
                status: res.status,
                bodyPreview: text.slice(0, 300),
            },
        };
    }

    try {
        return { ok: true, data: JSON.parse(text) as T };
    } catch {
        return {
            ok: false,
            error: {
                message: "Server returned invalid JSON",
                status: res.status,
                bodyPreview: text.slice(0, 300),
            },
        };
    }
}
