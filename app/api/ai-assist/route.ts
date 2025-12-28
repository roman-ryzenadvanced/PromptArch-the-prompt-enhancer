import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

// Schema validation
const schema = z.object({
  request: z.string().min(1),
  step: z.enum(["plan", "generate", "preview"]).default("plan"),
  plan: z.any().optional(),
  code: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional()
});

const STEPS = {
  plan: `You are an expert software architect. Create a DETAILED DEVELOPMENT PLAN for the following request: "{request}"

Output ONLY a JSON object:
{
  "summary": "One sentence overview",
  "architecture": "High-level components + data flow",
  "techStack": ["Next.js", "Tailwind", "Lucide Icons"],
  "files": [
    {"path": "app/page.tsx", "purpose": "Main UI"},
    {"path": "components/Preview.tsx", "purpose": "Core logic"}
  ],
  "timeline": "Estimate",
  "risks": ["Potential blockers"]
}`,

  generate: `You are a Senior Vibe Coder. Execute the following approved plan:
Plan: {plan}

Generate COMPLETE, PRODUCTION-READY code for all files. 
Focus on the request: "{request}"

Output ONLY a JSON object:
{
  "files": {
    "app/page.tsx": "// code here",
    "components/UI.tsx": "// more code"
  },
  "explanation": "How it works"
}`,

  preview: `Convert the following code into a single-file interactive HTML preview (Standalone).
Use Tailwind CDN. 

Code: {code}

Output ONLY valid HTML.`
};

export async function POST(req: NextRequest) {
  const requestId = randomUUID();

  try {
    // Safe body parsing
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body", requestId, success: false },
        { status: 400 }
      );
    }

    // Validate schema
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
          requestId,
          success: false
        },
        { status: 400 }
      );
    }

    const { request, step, plan, code } = parseResult.data;

    let prompt = STEPS[step];
    prompt = prompt.replace("{request}", request);
    if (plan) prompt = prompt.replace("{plan}", JSON.stringify(plan));
    if (code) prompt = prompt.replace("{code}", code);

    // Return the prompt for the frontend to use with the streaming adapter
    return NextResponse.json({
      prompt,
      step,
      requestId,
      success: true
    });
  } catch (err: any) {
    console.error(`[ai-assist] requestId=${requestId}`, err);

    return NextResponse.json(
      {
        error: err?.message ?? "AI Assist failed",
        requestId,
        success: false
      },
      { status: 500 }
    );
  }
}
