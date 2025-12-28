import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
    topic: z.string().min(3),
    slideCount: z.number().min(3).max(15).default(8),
    style: z.enum(["professional", "creative", "technical", "pitch"]).default("professional"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, slideCount, style } = schema.parse(body);

        const systemPrompt = `You are an elite presentation designer. Create a visually stunning presentation with ${slideCount} slides about "${topic}".
    
Style: ${style}

Output ONLY a sequence of slides separated by "---".
Format each slide as:
## [Slide Title]
- [Bullet Point 1]
- [Bullet Point 2]
VISUAL: [Detailed description of image/chart/icon]
---
`;

        // The frontend will handle the actual generation call to keep use of the ModelAdapter,
        // this route serves as the prompt orchestrator.
        return NextResponse.json({
            prompt: systemPrompt,
            success: true
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
