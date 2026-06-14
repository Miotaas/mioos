import { NextResponse } from "next/server";
import { getAIProvider, isAIEnabled } from "@/lib/ai/provider";

export async function POST() {
  if (!isAIEnabled()) {
    return NextResponse.json({
      ok: false,
      latency: 0,
      provider: "none",
      message: "No AI provider configured. Set AI_PROVIDER and the corresponding API key.",
    });
  }

  const start = Date.now();
  try {
    const ai       = getAIProvider();
    const response = await ai.generate('Respond with exactly: "MioOS AI connection successful."');
    const latency  = Date.now() - start;
    return NextResponse.json({ ok: true, latency, response: response.slice(0, 200) });
  } catch (error) {
    const latency = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, latency, message });
  }
}
