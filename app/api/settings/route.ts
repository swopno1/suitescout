import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { KNOWN_MODELS, getDefaultModel } from "@/lib/inference";

export const dynamic = "force-dynamic";

const KNOWN_MODEL_IDS: string[] = KNOWN_MODELS.map((m) => m.id);

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json({
    inference_model: settings.inference_model || getDefaultModel(),
    followup_delay_days: Number(settings.followup_delay_days || "3"),
  });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { inference_model, followup_delay_days } = body as {
    inference_model?: unknown;
    followup_delay_days?: unknown;
  };
  if (
    typeof inference_model !== "string" ||
    !KNOWN_MODEL_IDS.includes(inference_model)
  ) {
    return NextResponse.json(
      { error: `inference_model must be one of: ${KNOWN_MODEL_IDS.join(", ")}` },
      { status: 400 },
    );
  }
  const delay = Number(followup_delay_days);
  if (!Number.isInteger(delay) || delay < 1 || delay > 30) {
    return NextResponse.json(
      { error: "followup_delay_days must be an integer between 1 and 30" },
      { status: 400 },
    );
  }
  await setSetting("inference_model", inference_model);
  await setSetting("followup_delay_days", String(delay));
  return NextResponse.json({
    inference_model,
    followup_delay_days: delay,
  });
}
