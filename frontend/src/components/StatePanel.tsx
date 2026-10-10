import React from 'react';
import { QualificationState } from '../types';
import { StatusBadge } from './StatusBadge';

function fmt(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} lakh`;
    return String(val);
  }
  return String(val);
}

function FieldRow({ label, value, answered, isKey }: {
  label: string;
  value: unknown;
  answered: boolean;
  isKey?: boolean;
}) {
  const unknown = value === null || value === undefined || value === 'unknown';
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '7px 12px',
      borderRadius: 7,
      background: answered ? '#f0fdf4' : unknown ? '#fafafa' : '#fff7ed',
      border: `1px solid ${answered ? '#bbf7d0' : unknown ? '#e5e7eb' : '#fed7aa'}`,
      marginBottom: 5,
      fontWeight: isKey ? 600 : 400,
    }}>
      <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
      <span style={{
        fontSize: 13,
        color: answered ? '#065f46' : unknown ? '#9ca3af' : '#92400e',
        fontWeight: 600,
      }}>
        {unknown ? 'Not yet collected' : fmt(value)}
        {answered && ' ✓'}
      </span>
    </div>
  );
}

export function StatePanel({ state }: { state: QualificationState }) {
  const af = new Set(state.answeredFields);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Outcome */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Call Outcome</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge value={state.callOutcome} />
          <StatusBadge value={state.qualificationStatus} />
        </div>
        {state.terminationReason && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>
            {state.terminationReason}
          </div>
        )}
      </div>

      {/* Customer */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Customer Status</div>
        <FieldRow label="Verified" value={state.customerVerified} answered={state.customerVerified === true} />
        <FieldRow label="Busy" value={state.customerBusy} answered={state.customerBusy !== null} />
        {state.callbackTime && (
          <FieldRow label="Callback Time" value={state.callbackTime} answered={true} />
        )}
      </div>

      {/* Eligibility Checklist */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Eligibility Checklist ({af.size}/8 fields collected)
        </div>

        <FieldRow label="1. Property Type" value={state.propertyType} answered={af.has('propertyType')} isKey />
        <FieldRow label="2. Ownership Status" value={state.ownershipStatus} answered={af.has('ownershipStatus')} isKey />
        <FieldRow label="3. Original Documents" value={state.originalDocumentsAvailable} answered={af.has('originalDocumentsAvailable')} isKey />
        <FieldRow label="4. Requested Loan Amount" value={state.requestedLoanAmount} answered={af.has('requestedLoanAmount')} isKey />
        <FieldRow label="5a. Occupation" value={state.occupation} answered={af.has('occupation')} isKey />
        <FieldRow label="5b. Income Mode" value={state.incomeMode} answered={af.has('incomeMode')} isKey />
        <FieldRow label="6. Property Market Value" value={state.propertyMarketValue} answered={af.has('propertyMarketValue')} isKey />
        <FieldRow label="7. Tenure (years)" value={state.tenureYears} answered={af.has('tenureYears')} isKey />

        {state.nextQuestion && !['disqualified','transfer_required','callback_requested','qualified'].includes(state.qualificationStatus) && (
          <div style={{
            marginTop: 8,
            padding: '6px 10px',
            background: '#eff6ff',
            borderRadius: 6,
            fontSize: 12,
            color: '#1e40af',
            fontWeight: 600,
          }}>
            ➡️ Next question: <span style={{ textTransform: 'capitalize' }}>{state.nextQuestion.replace(/([A-Z])/g, ' $1')}</span>
          </div>
        )}
      </div>

      {/* Transfer / Special */}
      {(state.existingPropertyLoan || state.emiReductionRequest || state.transferRequired) && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#faf5ff', border: '1px solid #e9d5ff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Transfer Flags</div>
          <FieldRow label="Existing Property Loan" value={state.existingPropertyLoan} answered={state.existingPropertyLoan === true} />
          <FieldRow label="EMI Reduction Request" value={state.emiReductionRequest} answered={state.emiReductionRequest === true} />
          <FieldRow label="Transfer Required" value={state.transferRequired} answered={state.transferRequired} />
        </div>
      )}

      {/* Loan Cap */}
      {state.loanAmountCapAccepted !== null && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Loan Cap Decision</div>
          <FieldRow label="Accepted ₹75L Cap" value={state.loanAmountCapAccepted} answered={true} />
        </div>
      )}
    </div>
  );
}
