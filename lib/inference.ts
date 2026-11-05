// Vultr Serverless Inference client — OpenAI-compatible chat completions.
// Base URL and model IDs per BUILD-SPEC.md §2. The API key lives in
// VULTR_INFERENCE_API_KEY (never in code, never in the repo).
import { getSetting } from "./db";

export const INFERENCE_BASE_URL = "https://api.vultrinference.com/v1";

export const DEFAULT_MODEL = "deepseek-v4.1-flash-1017";

/** Models available on Vultr Serverless Inference (verified from the
 *  live catalog). The scoring model is the cheap classifier; the primary
 *  model does research + drafting. */
export const KNOWN_MODELS = [
  {
    id: "deepseek-v4.1-flash-1017",
    label: "DeepSeek V4.1 Flash — primary (research + drafting)",
  },
  {
    id: "qwen3.8-flash-next",
    label: "Qwen 3.8 Flash Next — scoring / classification",
  },
  { id: "glm-5.3-flash", label: "GLM 5.3 Flash" },
  { id: "mimo-v2.6-flash", label: "MiMo V2.6 Flash" },
] as const;

export function getDefaultModel(): string {
  return process.env.VULTR_INFERENCE_MODEL || DEFAULT_MODEL;
}

/** Settings override wins over the env default; env wins over the
 *  hardcoded default. Friday's executor uses this. */
export function getEffectiveModel(): string {
  return getSetting("inference_model") || getDefaultModel();
}

export function isInferenceConfigured(): boolean {
  return Boolean(process.env.VULTR_INFERENCE_API_KEY);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/** One chat completion against Vultr Serverless Inference. Throws on
 *  missing key or non-OK responses — callers surface the error, never
 *  fake a reply. */
export async function chatCompletion(
  options: ChatCompletionOptions,
): Promise<string> {
  const apiKey = process.env.VULTR_INFERENCE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VULTR_INFERENCE_API_KEY is not set — add it to .env (see .env.example).",
    );
  }
  const model = options.model || getEffectiveModel();
  const res = await fetch(`${INFERENCE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      ...(options.maxTokens
        ? { max_tokens: options.maxTokens }
        : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Vultr inference failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Vultr inference returned an empty reply.");
  }
  return content;
}

/** List models the key can access (GET /v1/models). Used by Settings to
 *  confirm the key works. Returns model ids. */
export async function listModels(): Promise<string[]> {
  const apiKey = process.env.VULTR_INFERENCE_API_KEY;
  if (!apiKey) {
    throw new Error("VULTR_INFERENCE_API_KEY is not set.");
  }
  const res = await fetch(`${INFERENCE_BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Vultr model list failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data || []).map((m) => m.id);
}
