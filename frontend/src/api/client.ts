// In production (Vercel), VITE_API_BASE_URL points to the Render backend.
// In development, Vite proxies /api → localhost:4000.
const BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; mockMode: boolean }>('/health'),

  startSession: (body: {
    customerName: string;
    agentName?: string;
    companyName?: string;
  }) =>
    request<{
      sessionId: string;
      agentGreeting: string;
      qualificationState: import('../types').QualificationState;
    }>('/session/start', { method: 'POST', body: JSON.stringify(body) }),

  sendMessage: (sessionId: string, utterance: string) =>
    request<{
      sessionId: string;
      agentResponse: string;
      qualificationState: import('../types').QualificationState;
    }>('/session/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, utterance }),
    }),

  getScenarios: () =>
    request<{ scenarios: import('../types').TestScenario[] }>('/scenarios'),

  runScenario: (id: string) =>
    request<import('../types').ScenarioResult>(`/scenarios/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  runAllScenarios: () =>
    request<import('../types').RunAllResult>('/scenarios/run-all', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  getSystemPrompt: () =>
    request<{ prompt: string }>('/prompt'),

  voiceStatus: () =>
    request<{
      provider: string;
      mockMode: boolean;
      configured: boolean;
      instructions: string;
    }>('/voice-provider/status'),
};
