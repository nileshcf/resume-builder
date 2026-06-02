import { useState } from "react";
import {
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  DEFAULT_MODELS,
  type AiConfig,
  type Provider,
} from "@/ai/config";
import { chat } from "@/ai/client";
import { Modal } from "./Modal";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<AiConfig>(loadAiConfig());
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const set = (patch: Partial<AiConfig>) => setCfg((c) => ({ ...c, ...patch }));

  function changeProvider(p: Provider) {
    set({ provider: p, model: cfg.model || DEFAULT_MODELS[p] });
  }

  function save() {
    saveAiConfig(cfg);
    onClose();
  }

  function disable() {
    clearAiConfig();
    setCfg({ provider: "none", apiKey: "", model: "", baseUrl: "" });
  }

  async function testConnection() {
    setTesting(true);
    setTest(null);
    try {
      const out = await chat(cfg, { system: "Reply with the single word: ok", user: "ping", maxTokens: 5 });
      setTest({ ok: true, msg: `Connected. Model replied: "${out.slice(0, 40)}"` });
    } catch (e) {
      setTest({ ok: false, msg: e instanceof Error ? e.message : "Failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal title="AI assistant (optional)" onClose={onClose} maxWidth={560}>
          <p className="muted">
            The whole app works <b>without</b> AI. If you add your own API key, AI features
            (bullet rewriting, summary drafting, smarter tailoring) turn on. There is no
            server here — your key and text go <b>directly from this browser to the provider
            you choose</b>, and the key is stored only in this browser.
          </p>

          <div className="field">
            <label>Provider</label>
            <select value={cfg.provider} onChange={(e) => changeProvider(e.target.value as Provider)}>
              <option value="none">None — no AI (default)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="custom">Custom (OpenAI-compatible endpoint)</option>
            </select>
          </div>

          {cfg.provider !== "none" && (
            <>
              {cfg.provider === "custom" && (
                <div className="field">
                  <label>Base URL</label>
                  <input
                    placeholder="https://openrouter.ai/api/v1"
                    value={cfg.baseUrl}
                    onChange={(e) => set({ baseUrl: e.target.value })}
                  />
                </div>
              )}
              <div className="field">
                <label>Model</label>
                <input
                  placeholder={DEFAULT_MODELS[cfg.provider]}
                  value={cfg.model}
                  onChange={(e) => set({ model: e.target.value })}
                />
              </div>
              <div className="field">
                <label>API key (stored only in this browser)</label>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="sk-…"
                  value={cfg.apiKey}
                  onChange={(e) => set({ apiKey: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={testConnection} disabled={testing || !cfg.apiKey}>
                  {testing ? "Testing…" : "Test connection"}
                </button>
                {test && (
                  <span style={{ fontSize: 12, color: test.ok ? "var(--ok)" : "var(--danger)" }}>
                    {test.msg}
                  </span>
                )}
              </div>
            </>
          )}

          <div className="modal-foot">
            <button className="btn" onClick={disable}>Disable AI</button>
            <button className="btn primary" onClick={save}>Save</button>
          </div>
    </Modal>
  );
}
