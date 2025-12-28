import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// We'll use the environment variables for provider routing
const schema = z.object({
    request: z.string().min(10),
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
    try {
        const body = await req.json();
        const { request, step, plan, code } = schema.parse(body);

        let prompt = STEPS[step];
        prompt = prompt.replace("{request}", request);
        if (plan) prompt = prompt.replace("{plan}", JSON.stringify(plan));
        if (code) prompt = prompt.replace("{code}", code);

        // In a real scenario, this would call the ModelAdapter/Service
        // For now, we'll return a structure that the frontend can handle,
        // instructing it to use the existing streaming adapter for the heavy lifting.

        return NextResponse.json({
            prompt,
            step,
            success: true
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
