import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/db";
import {
  chatCompletion,
  getDefaultModel,
  isInferenceConfigured,
} from "@/lib/inference";

export const dynamic = "force-dynamic";

/** Live connection check: one tiny inference call, timed. Never leaks
 *  the key — the response carries only ok/model/latency or an error. */
export async function POST() {
  if (!isInferenceConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "VULTR_INFERENCE_API_KEY is not set — agent and summaries run in fallback mode",
    });
  }
  const started = Date.now();
  const settings = await getAllSettings();
  const model = settings.inference_model || getDefaultModel();
  try {
    await chatCompletion({
      messages: [{ role: "user", content: "Reply with the word: ok" }],
      temperature: 0,
      // Reasoning models think (~10 tokens) before answering — a
      // 5-token budget returns length-cutoff with empty content.
      maxTokens: 60,
    });
    return NextResponse.json({
      ok: true,
      model,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      model,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : "connection failed",
    });
  }
}
