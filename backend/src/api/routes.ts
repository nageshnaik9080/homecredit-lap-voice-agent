// ─────────────────────────────────────────────────────────────
// Express API routes
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  startSession,
  processUtterance,
  getSession,
} from '../engine/conversationEngine';
import { serializeState } from '../engine/state';
import { isMockMode } from '../adapters/retell';
import { TEST_SCENARIOS } from '../data/testScenarios';
import { buildSystemPrompt } from '../prompts/systemPrompt';
import { verifyWebhookSignature } from '../adapters/retell';

const router = Router();

// ── Health ───────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mockMode: isMockMode(),
    timestamp: new Date().toISOString(),
  });
});

// ── Start session ────────────────────────────────────────────

const StartSchema = z.object({
  customerName: z.string().min(1),
  agentName: z.string().optional().default('Priya'),
  agentGender: z.string().optional().default('female'),
  companyName: z.string().optional().default('Home Credit'),
  languageToSpeak: z.string().optional().default('English'),
});

router.post('/session/start', (req: Request, res: Response) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
  }

  const { customerName, agentName, companyName } = parsed.data;
  const state = startSession({ customerName, agentName, companyName });

  return res.json({
    sessionId: state.sessionId,
    agentGreeting: state.lastAgentMessage,
    qualificationState: serializeState(state),
  });
});

// ── Process utterance ────────────────────────────────────────

const UtteranceSchema = z.object({
  sessionId: z.string().min(1),
  utterance: z.string().min(1),
});

router.post('/session/message', (req: Request, res: Response) => {
  const parsed = UtteranceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
  }

  const { sessionId, utterance } = parsed.data;
  const state = getSession(sessionId);
  if (!state) {
    return res.status(404).json({ error: 'Session not found. Please start a new session.' });
  }

  const agentResponse = processUtterance(state, utterance);

  return res.json({
    sessionId,
    agentResponse,
    qualificationState: serializeState(state),
  });
});

// ── Get session state ────────────────────────────────────────

router.get('/session/:id', (req: Request, res: Response) => {
  const state = getSession(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }
  return res.json({ qualificationState: serializeState(state) });
});

// ── Test scenarios ───────────────────────────────────────────

router.get('/scenarios', (_req: Request, res: Response) => {
  return res.json({ scenarios: TEST_SCENARIOS });
});

router.post('/scenarios/:id/run', (req: Request, res: Response) => {
  const scenario = TEST_SCENARIOS.find((s) => s.id === req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  const state = startSession({
    customerName: scenario.customerName,
    agentName: req.body?.agentName ?? 'Priya',
    companyName: req.body?.companyName ?? 'Home Credit',
  });

  const turns: { role: string; text: string }[] = [
    { role: 'agent', text: state.lastAgentMessage },
  ];

  for (const utterance of scenario.utterances) {
    const agentResponse = processUtterance(state, utterance);
    turns.push({ role: 'customer', text: utterance });
    turns.push({ role: 'agent', text: agentResponse });

    // Stop if terminated
    if (
      ['disqualified', 'transfer_required', 'callback_requested', 'qualified'].includes(
        state.qualificationStatus,
      )
    ) {
      break;
    }
  }

  return res.json({
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    expectedOutcome: scenario.expectedCallOutcome,
    actualOutcome: state.callOutcome,
    passed: state.callOutcome === scenario.expectedCallOutcome,
    qualificationState: serializeState(state),
    transcript: turns,
  });
});

// Run all scenarios
router.post('/scenarios/run-all', (_req: Request, res: Response) => {
  const results = TEST_SCENARIOS.map((scenario) => {
    const state = startSession({
      customerName: scenario.customerName,
      agentName: 'Priya',
      companyName: 'Home Credit',
    });

    for (const utterance of scenario.utterances) {
      processUtterance(state, utterance);
      if (
        ['disqualified', 'transfer_required', 'callback_requested', 'qualified'].includes(
          state.qualificationStatus,
        )
      ) break;
    }

    return {
      id: scenario.id,
      name: scenario.name,
      expectedOutcome: scenario.expectedCallOutcome,
      actualOutcome: state.callOutcome,
      passed: state.callOutcome === scenario.expectedCallOutcome,
    };
  });

  const passed = results.filter((r) => r.passed).length;
  return res.json({
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  });
});

// ── System prompt preview ────────────────────────────────────

router.get('/prompt', (_req: Request, res: Response) => {
  const prompt = buildSystemPrompt({
    company_name: 'Home Credit',
    customer_name: '{{customer_name}}',
    agent_name: 'Priya',
    agent_gender: 'female',
    current_date: new Date().toLocaleDateString('en-IN'),
    current_day: new Date().toLocaleDateString('en-IN', { weekday: 'long' }),
    current_time: new Date().toLocaleTimeString('en-IN'),
    additional_context_from_rag: '',
    language_to_speak: 'English',
    conversation_history: '',
    customer_utterance: '',
  });
  return res.json({ prompt });
});

// ── Retell webhook ───────────────────────────────────────────

router.post('/webhook/retell', (req: Request, res: Response) => {
  const sig = req.headers['x-retell-signature'] as string | undefined;
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, sig)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body as {
    event: string;
    call?: { call_id: string; call_status: string; transcript?: string };
  };

  console.log('[Webhook] Received Retell event:', event.event, event.call?.call_id);

  // In production, process the event and update your records
  return res.json({ received: true });
});

// ── Voice provider status ────────────────────────────────────

router.get('/voice-provider/status', (_req: Request, res: Response) => {
  return res.json({
    provider: 'retell',
    mockMode: isMockMode(),
    agentId: process.env.RETELL_AGENT_ID ?? null,
    configured: !isMockMode(),
    instructions: isMockMode()
      ? 'Set RETELL_API_KEY and RETELL_AGENT_ID in your .env file to enable real voice calls.'
      : 'Retell AI is configured.',
  });
});

export default router;
