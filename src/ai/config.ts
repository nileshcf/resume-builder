/**
 * Optional, user-supplied LLM configuration.
 *
 * PRIVACY MODEL: there is no backend. The key and any text are sent DIRECTLY
 * from the user's browser to the provider THEY chose. We never see or store it.
 * The config (incl. key) lives only in this browser's localStorage. AI is OFF
 * by default; every AI feature has a no-LLM fallback so the app is fully usable
 * without ever entering a key.
 */

export type Provider = "none" | "openai" | "anthropic" | "custom";

export interface AiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string; // used by "custom" (any OpenAI-compatible endpoint)
}

const KEY = "rb.ai.config.v1";

export const DEFAULT_MODELS: Record<Provider, string> = {
  none: "",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  custom: "",
};

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return blank();
}

export function saveAiConfig(cfg: AiConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function clearAiConfig(): void {
  localStorage.removeItem(KEY);
}

export function aiEnabled(cfg: AiConfig): boolean {
  return cfg.provider !== "none" && !!cfg.apiKey && !!cfg.model;
}

function blank(): AiConfig {
  return { provider: "none", apiKey: "", model: "", baseUrl: "" };
}
