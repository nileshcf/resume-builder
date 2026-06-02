import type { AiConfig } from "./config";

/**
 * Minimal browser-side chat client. Speaks two wire formats:
 *  - OpenAI-compatible (OpenAI, OpenRouter, Groq, local servers) via "openai"/"custom"
 *  - Anthropic Messages API via "anthropic"
 * No SDK — just fetch — to keep the bundle tiny and avoid a server.
 */

export interface ChatOpts {
  system: string;
  user: string;
  maxTokens?: number;
}

export async function chat(cfg: AiConfig, opts: ChatOpts): Promise<string> {
  if (cfg.provider === "anthropic") return anthropic(cfg, opts);
  return openaiCompatible(cfg, opts);
}

async function openaiCompatible(cfg: AiConfig, o: ChatOpts): Promise<string> {
  const base =
    cfg.provider === "custom" && cfg.baseUrl
      ? cfg.baseUrl.replace(/\/$/, "")
      : "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: o.maxTokens ?? 512,
      messages: [
        { role: "system", content: o.system },
        { role: "user", content: o.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function anthropic(cfg: AiConfig, o: ChatOpts): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      // required to allow calling Anthropic directly from a browser
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: o.maxTokens ?? 512,
      system: o.system,
      messages: [{ role: "user", content: o.user }],
    }),
  });
  if (!res.ok) throw new Error(`Provider error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.content?.[0]?.text ?? "").trim();
}
