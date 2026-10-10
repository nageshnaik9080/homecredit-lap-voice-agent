// ─────────────────────────────────────────────────────────────
// Retell AI adapter
// Provides a thin wrapper around Retell REST API.
// Falls back gracefully when RETELL_API_KEY is not set (mock mode).
// ─────────────────────────────────────────────────────────────

export interface RetellAgentConfig {
  agentName: string;
  systemPrompt: string;
  voiceId?: string;
  language?: string;
}

export interface RetellCallConfig {
  agentId: string;
  fromNumber?: string;
  toNumber?: string;
  metadata?: Record<string, string>;
}

const RETELL_BASE = 'https://api.retellai.com';

function getApiKey(): string | null {
  return process.env.RETELL_API_KEY ?? null;
}

export function isMockMode(): boolean {
  const key = getApiKey();
  return !key || key.trim() === '' || process.env.MOCK_MODE === 'true';
}

// ── Create / update agent ────────────────────────────────────

export async function createOrUpdateAgent(
  config: RetellAgentConfig,
): Promise<{ agentId: string; mock: boolean }> {
  if (isMockMode()) {
    console.log('[Retell Mock] createOrUpdateAgent called (mock mode)');
    return { agentId: 'mock-agent-id-001', mock: true };
  }

  const key = getApiKey()!;
  const existingId = process.env.RETELL_AGENT_ID;

  if (existingId) {
    // PATCH existing
    const res = await fetch(`${RETELL_BASE}/update-agent/${existingId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: config.agentName,
        response_engine: {
          type: 'retell-llm',
          llm_websocket_url: undefined, // use Retell-managed LLM
        },
        voice_id: config.voiceId ?? 'elevenlabs-jennifer',
        language: config.language ?? 'en-US',
        // General prompt
        general_prompt: config.systemPrompt,
      }),
    });
    const data = await res.json() as { agent_id: string };
    return { agentId: data.agent_id ?? existingId, mock: false };
  }

  // POST create
  const res = await fetch(`${RETELL_BASE}/create-agent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_name: config.agentName,
      voice_id: config.voiceId ?? 'elevenlabs-jennifer',
      language: config.language ?? 'en-US',
      general_prompt: config.systemPrompt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell create-agent failed: ${res.status} — ${err}`);
  }

  const data = await res.json() as { agent_id: string };
  return { agentId: data.agent_id, mock: false };
}

// ── Web call (outbound) ──────────────────────────────────────

export async function createWebCall(
  config: RetellCallConfig,
): Promise<{ callId: string; accessToken: string; mock: boolean }> {
  if (isMockMode()) {
    console.log('[Retell Mock] createWebCall called (mock mode)');
    return {
      callId: `mock-call-${Date.now()}`,
      accessToken: 'mock-access-token',
      mock: true,
    };
  }

  const key = getApiKey()!;
  const res = await fetch(`${RETELL_BASE}/v2/create-web-call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: config.agentId,
      metadata: config.metadata,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell create-web-call failed: ${res.status} — ${err}`);
  }

  const data = await res.json() as { call_id: string; access_token: string };
  return { callId: data.call_id, accessToken: data.access_token, mock: false };
}

// ── Webhook verification ─────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
): boolean {
  if (isMockMode()) return true;
  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  // Retell signs with HMAC-SHA256
  const crypto = require('crypto') as typeof import('crypto');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
