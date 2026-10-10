import React, { useState } from 'react';
import { api } from '../api/client';
import { TestScenario, ScenarioResult, RunAllResult } from '../types';

export function TestRunner({ scenarios }: { scenarios: TestScenario[] }) {
  const [runAllResult, setRunAllResult] = useState<RunAllResult | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [error, setError] = useState('');

  const handleRunAll = async () => {
    setLoading(true);
    setError('');
    setScenarioResult(null);
    try {
      const r = await api.runAllScenarios();
      setRunAllResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRunOne = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    setRunAllResult(null);
    try {
      const r = await api.runScenario(selectedId);
      setScenarioResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb'
      }}>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 7,
            border: '1px solid #d1d5db', fontSize: 14, background: '#f9fafb'
          }}
        >
          <option value="">— Select a scenario —</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={handleRunOne}
          disabled={!selectedId || loading}
          style={{
            padding: '8px 18px', borderRadius: 7, border: 'none',
            background: '#1e40af', color: '#fff', fontWeight: 600, fontSize: 14
          }}
        >
          {loading ? '⏳ Running…' : '▶ Run Scenario'}
        </button>
        <button
          onClick={handleRunAll}
          disabled={loading}
          style={{
            padding: '8px 18px', borderRadius: 7, border: 'none',
            background: '#059669', color: '#fff', fontWeight: 600, fontSize: 14
          }}
        >
          {loading ? '⏳ Running…' : '🧪 Run All 12 Tests'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
          ❌ {error}
        </div>
      )}

      {/* Run-all results */}
      {runAllResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Summary bar */}
          <div style={{
            display: 'flex', gap: 16, padding: '14px 18px',
            background: runAllResult.failed === 0 ? '#d1fae5' : '#fef3c7',
            borderRadius: 10,
            border: `1px solid ${runAllResult.failed === 0 ? '#6ee7b7' : '#fcd34d'}`
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: runAllResult.failed === 0 ? '#065f46' : '#92400e' }}>
              {runAllResult.passed}/{runAllResult.total} Passed
            </span>
            {runAllResult.failed > 0 && (
              <span style={{ fontSize: 15, color: '#991b1b', fontWeight: 600, alignSelf: 'center' }}>
                {runAllResult.failed} Failed
              </span>
            )}
            {runAllResult.failed === 0 && (
              <span style={{ fontSize: 15, color: '#065f46', fontWeight: 600, alignSelf: 'center' }}>
                🎉 All tests pass!
              </span>
            )}
          </div>

          {/* Individual results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runAllResult.results.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 14px', borderRadius: 8,
                background: r.passed ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${r.passed ? '#bbf7d0' : '#fecaca'}`,
              }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                    Expected: <b>{r.expectedOutcome}</b> · Got: <b>{r.actualOutcome}</b>
                  </span>
                </div>
                <span style={{ fontSize: 18 }}>{r.passed ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single scenario result */}
      {scenarioResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', borderRadius: 10,
            background: scenarioResult.passed ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${scenarioResult.passed ? '#6ee7b7' : '#fca5a5'}`
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: scenarioResult.passed ? '#065f46' : '#991b1b' }}>
              {scenarioResult.passed ? '✅ PASSED' : '❌ FAILED'} — {scenarioResult.scenarioName}
            </div>
            <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
              Expected: <b>{scenarioResult.expectedOutcome}</b> · 
              Got: <b>{scenarioResult.actualOutcome}</b>
            </div>
          </div>

          {/* Transcript */}
          <div style={{ padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Full Transcript
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenarioResult.transcript.map((t, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: t.role === 'agent' ? 'flex-start' : 'flex-end',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: t.role === 'agent' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    background: t.role === 'agent' ? '#1e40af' : '#f3f4f6',
                    color: t.role === 'agent' ? '#fff' : '#1a202c',
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>
                      {t.role === 'agent' ? '🤖 Priya (Agent)' : '👤 Customer'}
                    </div>
                    {t.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final state summary */}
          <div style={{ padding: 14, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#374151' }}>Final Qualification State</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {[
                ['Property Type', scenarioResult.qualificationState.propertyType],
                ['Ownership', scenarioResult.qualificationState.ownershipStatus],
                ['Orig. Docs', String(scenarioResult.qualificationState.originalDocumentsAvailable)],
                ['Loan Amount', scenarioResult.qualificationState.requestedLoanAmount ? `₹${(scenarioResult.qualificationState.requestedLoanAmount/100000).toFixed(1)}L` : '—'],
                ['Occupation', scenarioResult.qualificationState.occupation],
                ['Income Mode', scenarioResult.qualificationState.incomeMode],
                ['Market Value', scenarioResult.qualificationState.propertyMarketValue ? `₹${(scenarioResult.qualificationState.propertyMarketValue/100000).toFixed(1)}L` : '—'],
                ['Tenure', scenarioResult.qualificationState.tenureYears ? `${scenarioResult.qualificationState.tenureYears} yrs` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: '#6b7280' }}>{k}:</span>
                  <span style={{ fontWeight: 600, color: v === 'unknown' || v === 'null' || v === 'undefined' ? '#9ca3af' : '#111827' }}>
                    {v === 'null' || v === 'undefined' ? '—' : v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
