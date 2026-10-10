import React from 'react';

const colors: Record<string, { bg: string; color: string; label: string }> = {
  pending:      { bg: '#f3f4f6', color: '#6b7280', label: 'Pending' },
  eligible:     { bg: '#d1fae5', color: '#065f46', label: '✅ Eligible' },
  disqualified: { bg: '#fee2e2', color: '#991b1b', label: '❌ Disqualified' },
  transfer_required: { bg: '#ede9fe', color: '#5b21b6', label: '🔄 Transfer Required' },
  callback_requested: { bg: '#fef3c7', color: '#92400e', label: '📞 Callback Requested' },
  error:        { bg: '#fee2e2', color: '#991b1b', label: '⚠️ Error' },

  // qualification status
  not_started:          { bg: '#f3f4f6', color: '#6b7280', label: 'Not Started' },
  verifying:            { bg: '#dbeafe', color: '#1e40af', label: '🔍 Verifying' },
  presenting_offer:     { bg: '#dbeafe', color: '#1e40af', label: '📋 Presenting Offer' },
  collecting_eligibility: { bg: '#fef3c7', color: '#92400e', label: '📝 Collecting Info' },
  pending_loan_cap_decision: { bg: '#fef3c7', color: '#92400e', label: '⚖️ Loan Cap Decision' },
  qualified:            { bg: '#d1fae5', color: '#065f46', label: '✅ Qualified' },
  completed:            { bg: '#f3f4f6', color: '#6b7280', label: 'Completed' },
};

export function StatusBadge({ value }: { value: string }) {
  const s = colors[value] ?? { bg: '#f3f4f6', color: '#6b7280', label: value };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
}
