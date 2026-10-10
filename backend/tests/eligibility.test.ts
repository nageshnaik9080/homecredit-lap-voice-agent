// ─────────────────────────────────────────────────────────────
// Automated eligibility-engine tests
// Run with: npm test (inside backend/)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { startSession, processUtterance, getSession } from '../src/engine/conversationEngine';
import { QualificationState } from '../src/types';

// Helper: run a full scenario
function runScenario(
  customerName: string,
  utterances: string[],
): QualificationState {
  const state = startSession({
    customerName,
    agentName: 'Priya',
    companyName: 'Home Credit',
  });

  for (const u of utterances) {
    processUtterance(state, u);
    if (
      ['disqualified', 'transfer_required', 'callback_requested', 'qualified'].includes(
        state.qualificationStatus,
      )
    ) break;
  }

  return state;
}

// ── 1. Fully eligible ────────────────────────────────────────

describe('Scenario 1 — Fully Eligible Customer', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Rahul Sharma', [
      'Yes, this is Rahul.',
      'Sure, go ahead.',
      "It's a residential property.",
      "I'm the sole owner.",
      'Yes, I have the original documents at home.',
      'I need around 50 lakhs.',
      "I'm salaried and salary comes to my bank account.",
      'The property is worth about 1 crore.',
      "I'd like 10 years.",
    ]);
  });

  it('should reach qualified status', () => {
    expect(state.qualificationStatus).toBe('qualified');
  });
  it('should set callOutcome to eligible', () => {
    expect(state.callOutcome).toBe('eligible');
  });
  it('should have all fields answered', () => {
    expect(state.propertyType).toBe('residential');
    expect(state.ownershipStatus).toBe('sole');
    expect(state.originalDocumentsAvailable).toBe(true);
    expect(state.requestedLoanAmount).toBe(50_00_000);
    expect(state.occupation).toBe('salaried');
    expect(state.incomeMode).toBe('bank');
    expect(state.propertyMarketValue).toBe(1_00_00_000);
    expect(state.tenureYears).toBe(10);
  });
  it('should NOT be disqualified', () => {
    expect(state.disqualified).toBe(false);
  });
});

// ── 2. Agricultural property ─────────────────────────────────

describe('Scenario 2 — Agricultural Property', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Suresh Patel', [
      'Yes, speaking.',
      'Go ahead.',
      "It's agricultural land.",
    ]);
  });

  it('should be disqualified', () => {
    expect(state.qualificationStatus).toBe('disqualified');
    expect(state.callOutcome).toBe('disqualified');
    expect(state.disqualified).toBe(true);
  });
  it('should record agricultural property type', () => {
    expect(state.propertyType).toBe('agricultural');
  });
  it('should NOT ask further questions after disqualification', () => {
    const afterDisqual = processUtterance(state, 'Wait, I have more info');
    expect(afterDisqual).toContain("we've completed our conversation");
    expect(state.qualificationStatus).toBe('disqualified');
  });
});

// ── 3. Cash income ───────────────────────────────────────────

describe('Scenario 3 — Cash Income', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Meena Reddy', [
      'Yes, this is Meena.',
      'Okay, proceed.',
      'Residential house.',
      'Sole owner.',
      'Yes, originals are available.',
      'Around 40 lakhs.',
      "I'm self-employed and I receive income in cash.",
    ]);
  });

  it('should be disqualified', () => {
    expect(state.callOutcome).toBe('disqualified');
  });
  it('should record cash income', () => {
    expect(state.incomeMode).toBe('cash');
  });
});

// ── 4. Missing original documents ────────────────────────────

describe('Scenario 4 — Missing Original Documents', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Anita Joshi', [
      'Yes, Anita here.',
      'Sure.',
      "It's a flat.",
      "I'm the sole owner.",
      'I only have photocopies, the originals are not available.',
    ]);
  });

  it('should be disqualified', () => {
    expect(state.callOutcome).toBe('disqualified');
  });
  it('should record documents unavailable', () => {
    expect(state.originalDocumentsAvailable).toBe(false);
  });
});

// ── 5. Tenure too short ──────────────────────────────────────

describe('Scenario 5 — Tenure Too Short (<3 years)', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Kiran Nair', [
      'Yes, this is Kiran.',
      'Tell me more.',
      "It's a commercial office.",
      'Sole owner.',
      'Yes, originals available.',
      'I need 30 lakhs.',
      "I'm salaried, salary to bank.",
      'Property worth 60 lakhs.',
      'I want to repay in 2 years.',
    ]);
  });

  it('should be disqualified for tenure too short', () => {
    expect(state.callOutcome).toBe('disqualified');
    expect(state.tenureYears).toBe(2);
  });
});

// ── 6. Tenure too long ───────────────────────────────────────

describe('Scenario 6 — Tenure Too Long (>15 years)', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Deepa Singh', [
      'Yes, Deepa here.',
      'Sounds good.',
      'Residential apartment.',
      'Jointly owned with my husband.',
      'Originals are available at home.',
      '50 lakhs please.',
      'I run a small business, income comes to bank.',
      'Property worth around 1.5 crore.',
      'I want 20 years to repay.',
    ]);
  });

  it('should be disqualified for tenure too long', () => {
    expect(state.callOutcome).toBe('disqualified');
    expect(state.tenureYears).toBe(20);
  });
});

// ── 7. Loan amount ₹90L → accept ₹75L ────────────────────────

describe('Scenario 7 — Loan Amount ₹90L → Accept Cap', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Vijay Kumar', [
      'Yes, speaking.',
      'Okay.',
      'Residential property.',
      'Sole owner.',
      'Yes, originals available.',
      'I need 90 lakhs.',
      "Yes, okay, I'll go with 75 lakhs.",
      "I'm salaried, income to bank.",
      'Property market value is around 2 crore.',
      '10 years.',
    ]);
  });

  it('should be eligible after accepting cap', () => {
    expect(state.callOutcome).toBe('eligible');
    expect(state.requestedLoanAmount).toBe(75_00_000);
    expect(state.loanAmountCapAccepted).toBe(true);
  });
});

// ── Loan amount ₹90L → decline ────────────────────────────────

describe('Scenario 7b — Loan Amount ₹90L → Decline Cap', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Rahul Test', [
      'Yes, speaking.',
      'Okay.',
      'Residential property.',
      'Sole owner.',
      'Yes, originals available.',
      'I need 90 lakhs.',
      "No, I need more than 75 lakhs, that won't work.",
    ]);
  });

  it('should be disqualified after declining cap', () => {
    expect(state.callOutcome).toBe('disqualified');
    expect(state.loanAmountCapAccepted).toBe(false);
  });
});

// ── 8. Joint ownership ───────────────────────────────────────

describe('Scenario 8 — Joint Ownership (Should be Eligible)', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Priya Mehta', [
      'Yes, this is Priya.',
      "Sure, let's proceed.",
      'Residential flat.',
      "It's jointly owned with my brother.",
      'Yes, I have the original documents.',
      'Around 40 lakhs.',
      "Salaried employee, salary to bank account.",
      'Property value is approximately 80 lakhs.',
      "I'd like 8 years.",
    ]);
  });

  it('should NOT disqualify joint ownership', () => {
    expect(state.ownershipStatus).toBe('joint');
    expect(state.callOutcome).toBe('eligible');
  });
});

// ── 9. Existing loan ─────────────────────────────────────────

describe('Scenario 9 — Existing Loan on Property', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Arun Pillai', [
      'Yes, this is Arun.',
      "Actually, I already have a loan on this property.",
    ]);
  });

  it('should route to transfer', () => {
    expect(state.callOutcome).toBe('transfer_required');
    expect(state.transferRequired).toBe(true);
  });
});

// ── 10. EMI reduction ────────────────────────────────────────

describe('Scenario 10 — EMI Reduction Request', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Sunita Verma', [
      'Yes, Sunita here.',
      "I'm interested in reducing my EMI.",
    ]);
  });

  it('should route to transfer for EMI reduction', () => {
    expect(state.callOutcome).toBe('transfer_required');
  });
});

// ── 11. Out-of-order answers ─────────────────────────────────

describe('Scenario 11 — Out-of-Order Answers', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Rohit Bansal', [
      'Yes, speaking.',
      'Sure.',
      "It's a residential house, jointly owned with my wife, worth about 80 lakhs.",
      'Yes, originals are at home.',
      'I need 45 lakhs.',
      "I'm self-employed, income credited to bank.",
      '12 years.',
    ]);
  });

  it('should capture all three facts from one utterance', () => {
    expect(state.propertyType).toBe('residential');
    expect(state.ownershipStatus).toBe('joint');
    expect(state.propertyMarketValue).toBe(80_00_000);
  });
  it('should reach eligible status', () => {
    expect(state.callOutcome).toBe('eligible');
  });
});

// ── 12. Busy customer ────────────────────────────────────────

describe('Scenario 12 — Busy Customer', () => {
  let state: QualificationState;
  beforeEach(() => {
    state = runScenario('Neha Gupta', [
      "I'm busy right now.",
      'Tomorrow morning at 10 am.',
    ]);
  });

  it('should set callback outcome', () => {
    expect(state.callOutcome).toBe('callback_requested');
    expect(state.customerBusy).toBe(true);
  });
});

// ── Edge: Loan amount exactly ₹75L ───────────────────────────

describe('Edge Case — Loan Amount Exactly ₹75 Lakh', () => {
  it('should continue without triggering cap logic', () => {
    const state = runScenario('Edge Case 1', [
      'Yes, speaking.',
      'Go ahead.',
      'Residential.',
      'Sole owner.',
      'Originals available.',
      'I need exactly 75 lakhs.',
      'Salaried, income to bank.',
      'Worth 2 crore.',
      '10 years.',
    ]);
    expect(state.requestedLoanAmount).toBe(75_00_000);
    expect(state.callOutcome).toBe('eligible');
    expect(state.loanAmountCapAccepted).toBeNull(); // not triggered
  });
});

// ── Edge: Tenure exactly 3 years ─────────────────────────────

describe('Edge Case — Tenure Exactly 3 Years', () => {
  it('should be eligible', () => {
    const state = runScenario('Edge Case 2', [
      'Yes.',
      'Okay.',
      'Residential.',
      'Sole owner.',
      'Originals available.',
      '30 lakhs.',
      'Salaried, bank income.',
      '80 lakhs market value.',
      '3 years.',
    ]);
    expect(state.tenureYears).toBe(3);
    expect(state.callOutcome).toBe('eligible');
  });
});

// ── Edge: Tenure exactly 15 years ────────────────────────────

describe('Edge Case — Tenure Exactly 15 Years', () => {
  it('should be eligible', () => {
    const state = runScenario('Edge Case 3', [
      'Yes.',
      'Okay.',
      'Commercial.',
      'Sole owner.',
      'Originals available.',
      '50 lakhs.',
      'Self-employed, bank income.',
      '1.5 crore market value.',
      '15 years.',
    ]);
    expect(state.tenureYears).toBe(15);
    expect(state.callOutcome).toBe('eligible');
  });
});

// ── Edge: Customer corrects an answer ────────────────────────

describe('Edge Case — Customer Corrects an Answer', () => {
  it('should use the corrected value', () => {
    const state = startSession({
      customerName: 'Test Correction',
      agentName: 'Priya',
      companyName: 'Home Credit',
    });

    processUtterance(state, 'Yes, speaking.');
    processUtterance(state, 'Go ahead.');
    processUtterance(state, 'Residential property.');
    processUtterance(state, 'Sole owner.');
    processUtterance(state, 'Originals available.');
    processUtterance(state, 'I need 40 lakhs.');
    processUtterance(state, 'Salaried, bank income.');
    processUtterance(state, 'Worth 80 lakhs.');
    // First says 5 years, then corrects to 12
    processUtterance(state, 'Umm, 5 years — actually no, make it 12 years.');
    expect(state.tenureYears).toBe(12);
  });
});

// ── Edge: Transfer intent mid-eligibility ────────────────────

describe('Edge Case — Transfer Intent After Eligibility Started', () => {
  it('should stop eligibility and route to transfer', () => {
    const state = startSession({
      customerName: 'Transfer Mid',
      agentName: 'Priya',
      companyName: 'Home Credit',
    });
    processUtterance(state, 'Yes, speaking.');
    processUtterance(state, 'Sure.');
    processUtterance(state, 'Residential property.');
    processUtterance(state, 'Actually, wait — I already have a loan on this property.');

    expect(state.callOutcome).toBe('transfer_required');
  });
});

// ── Edge: Interest-rate diversion ────────────────────────────

describe('Edge Case — Interest Rate Diversion', () => {
  it('should not state a rate and return to questions', () => {
    const state = startSession({
      customerName: 'Rate Curious',
      agentName: 'Priya',
      companyName: 'Home Credit',
    });
    processUtterance(state, 'Yes, speaking.');
    processUtterance(state, 'Sure.');
    const agentReply = processUtterance(state, 'What interest rate do you offer?');

    // The agent must not fabricate a rate
    expect(agentReply).not.toMatch(/\d+(\.\d+)?%/);
    // The agent should mention "senior loan expert" or "preliminary"
    expect(agentReply.toLowerCase()).toMatch(/expert|preliminary|rate/);
  });
});

// ── Edge: Premature handoff prevention ───────────────────────

describe('Edge Case — No premature handoff', () => {
  it('should not qualify before all 7 items are answered', () => {
    const state = startSession({
      customerName: 'Too Early',
      agentName: 'Priya',
      companyName: 'Home Credit',
    });
    processUtterance(state, 'Yes, speaking.');
    processUtterance(state, 'Go ahead.');
    processUtterance(state, 'Residential.');
    processUtterance(state, 'Sole owner.');
    // Only 2 of 7 answered
    expect(state.callOutcome).not.toBe('eligible');
    expect(state.qualificationStatus).toBe('collecting_eligibility');
  });
});

// ── Edge: Already-terminated session ─────────────────────────

describe('Edge Case — Messages after call is ended', () => {
  it('should not restart a terminated call', () => {
    const state = runScenario('Ghost Caller', [
      'Yes, speaking.',
      'Go ahead.',
      "It's agricultural land.",
    ]);
    expect(state.callOutcome).toBe('disqualified');

    const extra = processUtterance(state, 'Wait, actually it is residential!');
    expect(state.callOutcome).toBe('disqualified');
    expect(extra).toContain("we've completed our conversation");
  });
});
