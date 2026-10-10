import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { api } from './api/client';
import { QualificationState, TestScenario } from './types';
import { ChatWindow } from './components/ChatWindow';
import { StatePanel } from './components/StatePanel';
import { TestRunner } from './components/TestRunner';
import { StatusBadge } from './components/StatusBadge';

type Tab = 'demo' | 'tests' | 'prompt';

const QUICK_RESPONSES = [
  'Yes, this is me.',
  "I'm busy right now.",
  "It's a residential property.",
  "I'm the sole owner.",
  'Yes, I have the original documents at home.',
  'I need around 50 lakhs.',
  "I'm salaried and my salary comes to my bank account.",
  'The property is worth about 1 crore.',
  "I'd like to repay over 10 years.",
  "I already have a loan on this property.",
  "I want to reduce my EMI.",
  "It's agricultural land.",
  "I only have photocopies.",
  "My income is received in cash.",
  "I need 90 lakhs.",
  "Yes, I'll proceed with 75 lakhs.",
];

const PRESET_CUSTOMERS = [
  { name: 'Rahul Sharma', label: 'Rahul Sharma' },
  { name: 'Suresh Patel', label: 'Suresh Patel' },
  { name: 'Priya Mehta', label: 'Priya Mehta' },
  { name: 'Vijay Kumar', label: 'Vijay Kumar' },
  { name: 'Meena Reddy', label: 'Meena Reddy' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('demo');

  // Backend health
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [mockMode, setMockMode] = useState(true);

  // Session
  const [sessionId, setSessionId] = useState('');
  const [state, setState] = useState<QualificationState | null>(null);
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [agentName] = useState('Priya');
  const [companyName] = useState('Home Credit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Chat
  const [input, setInput] = useState('');

  // Tests
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);

  // System prompt
  const [prompt, setPrompt] = useState('');

  // Check backend health on mount
  useEffect(() => {
    api.health()
      .then(r => { setBackendOk(true); setMockMode(r.mockMode); })
      .catch(() => setBackendOk(false));
    api.getScenarios().then(r => setScenarios(r.scenarios)).catch(() => {});
  }, []);

  const isTerminated = state &&
    ['disqualified', 'transfer_required', 'callback_requested', 'qualified', 'completed']
      .includes(state.qualificationStatus);

  const handleStart = async () => {
    if (!customerName.trim()) return;
    setLoading(true);
    setError('');
    setState(null);
    setSessionId('');
    try {
      const r = await api.startSession({ customerName: customerName.trim(), agentName, companyName });
      setSessionId(r.sessionId);
      setState(r.qualificationState);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !sessionId || isTerminated) return;
    setInput('');
    setLoading(true);
    setError('');
    try {
      const r = await api.sendMessage(sessionId, msg);
      setState(r.qualificationState);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleLoadPrompt = async () => {
    try {
      const r = await api.getSystemPrompt();
      setPrompt(r.prompt);
    } catch (e: unknown) {
      setPrompt('Error loading prompt: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const turns = state?.conversationHistory ?? [];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 20,
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            🏠 Home Credit — LAP Voice Agent
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            AI Voice Agent · Loan Against Property Qualification Demo
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: mockMode ? 'rgba(255,255,255,0.15)' : 'rgba(5,150,105,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            {mockMode ? '🧪 Mock Mode' : '🔴 Live Mode'}
          </span>
          <span style={{
            padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: backendOk === null ? 'rgba(255,255,255,0.15)' : backendOk ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            {backendOk === null ? '⏳ Connecting…' : backendOk ? '✅ Backend Online' : '❌ Backend Offline'}
          </span>
        </div>
      </div>

      {backendOk === false && (
        <div style={{
          padding: 16, background: '#fee2e2', borderRadius: 10, border: '1px solid #fca5a5',
          marginBottom: 16, fontSize: 14, color: '#991b1b', lineHeight: 1.6
        }}>
          <strong>Backend not reachable.</strong> Make sure you've run <code>npm run dev</code> inside the <code>backend/</code> folder.
          <br />The backend runs on <code>http://localhost:4000</code>.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#fff', padding: 4, borderRadius: 10, border: '1px solid #e5e7eb', width: 'fit-content' }}>
        {(['demo', 'tests', 'prompt'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 7, border: 'none',
            background: tab === t ? '#1e40af' : 'transparent',
            color: tab === t ? '#fff' : '#6b7280',
            fontWeight: 600, fontSize: 14,
            transition: 'all 0.15s',
          }}>
            {t === 'demo' ? '💬 Live Demo' : t === 'tests' ? '🧪 Test Scenarios' : '📋 System Prompt'}
          </button>
        ))}
      </div>

      {/* ───── DEMO TAB ───── */}
      {tab === 'demo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
          {/* Left: Chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Start session */}
            <div style={{
              padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
              display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end'
            }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Customer Name
                </label>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 7,
                    border: '1px solid #d1d5db', fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Presets
                </label>
                <select
                  onChange={e => setCustomerName(e.target.value)}
                  value=""
                  style={{ padding: '8px 12px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 14, background: '#f9fafb' }}
                >
                  <option value="">Pick preset…</option>
                  {PRESET_CUSTOMERS.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </div>
              <button
                onClick={handleStart}
                disabled={loading || !customerName.trim()}
                style={{
                  padding: '9px 22px', borderRadius: 7, border: 'none',
                  background: '#1e40af', color: '#fff', fontWeight: 700, fontSize: 14,
                  whiteSpace: 'nowrap'
                }}
              >
                {loading && !sessionId ? '⏳ Starting…' : sessionId ? '🔄 New Call' : '📞 Start Call'}
              </button>
            </div>

            {/* Chat area */}
            {state && (
              <div style={{ padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Status bar */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    Call with <strong>{customerName}</strong>
                  </span>
                  <StatusBadge value={state.qualificationStatus} />
                  {state.callOutcome !== 'pending' && <StatusBadge value={state.callOutcome} />}
                </div>

                <ChatWindow turns={turns} />

                {/* Input */}
                {!isTerminated && (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Type what the customer says… (Enter to send)"
                        disabled={loading}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 8,
                          border: '1px solid #d1d5db', fontSize: 14
                        }}
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        style={{
                          padding: '10px 18px', borderRadius: 8, border: 'none',
                          background: '#1e40af', color: '#fff', fontWeight: 700, fontSize: 14
                        }}
                      >
                        {loading ? '⏳' : 'Send ➤'}
                      </button>
                    </div>

                    {/* Quick replies */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Quick Replies
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {QUICK_RESPONSES.map(r => (
                          <button key={r} onClick={() => handleSend(r)} disabled={loading}
                            style={{
                              padding: '4px 10px', borderRadius: 99, border: '1px solid #d1d5db',
                              background: '#f9fafb', color: '#374151', fontSize: 12, cursor: 'pointer'
                            }}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {isTerminated && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8, textAlign: 'center',
                    background: '#f9fafb', border: '1px dashed #d1d5db',
                    fontSize: 14, color: '#6b7280'
                  }}>
                    Call has ended — <button onClick={handleStart} style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Start a new call</button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
                ❌ {error}
              </div>
            )}

            {!state && !error && (
              <div style={{
                padding: 32, background: '#fff', borderRadius: 10, border: '1px dashed #d1d5db',
                textAlign: 'center', color: '#9ca3af', fontSize: 14
              }}>
                Enter a customer name and click <strong>"Start Call"</strong> to begin the LAP qualification demo
              </div>
            )}
          </div>

          {/* Right: State Panel */}
          <div>
            {state ? (
              <div style={{ position: 'sticky', top: 20 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10,
                  textTransform: 'uppercase', letterSpacing: 1
                }}>
                  Qualification State
                </div>
                <StatePanel state={state} />
              </div>
            ) : (
              <div style={{
                padding: 24, background: '#fff', borderRadius: 10, border: '1px dashed #e5e7eb',
                color: '#9ca3af', textAlign: 'center', fontSize: 13
              }}>
                State panel will show here once a call starts
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── TESTS TAB ───── */}
      {tab === 'tests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '14px 18px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 14, color: '#1e40af', lineHeight: 1.6 }}>
            <strong>12 business-rule test scenarios</strong> covering all eligibility paths from the assignment spec.
            Run individual scenarios to see full transcripts, or run all at once to get a pass/fail summary.
          </div>
          <TestRunner scenarios={scenarios} />
        </div>
      )}

      {/* ───── PROMPT TAB ───── */}
      {tab === 'prompt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
              Production-ready system prompt for Retell AI / Bolna with all business rules, state management, and variable placeholders.
            </div>
            <button onClick={handleLoadPrompt} style={{
              padding: '8px 18px', borderRadius: 7, border: 'none',
              background: '#1e40af', color: '#fff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap'
            }}>
              Load Prompt
            </button>
          </div>
          {prompt && (
            <textarea
              readOnly
              value={prompt}
              style={{
                width: '100%', height: 600, padding: '14px 16px',
                borderRadius: 10, border: '1px solid #e5e7eb',
                fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6,
                background: '#1e293b', color: '#e2e8f0',
                resize: 'vertical',
              }}
            />
          )}
          {!prompt && (
            <div style={{
              padding: 40, background: '#f9fafb', borderRadius: 10,
              border: '1px dashed #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: 14
            }}>
              Click "Load Prompt" to view the full system prompt
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
        Home Credit LAP Voice Agent · SalesAgents AI Assignment · Mock Mode Active
      </div>
    </div>
  );
}
