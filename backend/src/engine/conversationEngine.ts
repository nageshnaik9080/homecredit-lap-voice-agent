// ─────────────────────────────────────────────────────────────
// Deterministic Conversation Engine  (v3 — all fixes applied)
// ─────────────────────────────────────────────────────────────

import { QualificationState, ConversationTurn, EligibilityField } from '../types';
import { extractFacts, ExtractedFacts } from './extractor';
import {
  checkDisqualification,
  DISQUAL_MESSAGES,
  TRANSFER_MESSAGE,
  QUALIFIED_HANDOFF_MESSAGE,
  MAX_LOAN_AMOUNT,
} from './eligibility';
import { getNextMissingItem, getQuestion, getLoanCapQuestion } from './questions';
import { createInitialState } from './state';

// ── In-memory session store ──────────────────────────────────
const sessions = new Map<string, QualificationState>();

export function getSession(id: string): QualificationState | undefined {
  return sessions.get(id);
}
export function deleteSession(id: string): void {
  sessions.delete(id);
}

// ── Helpers ──────────────────────────────────────────────────
function addTurn(state: QualificationState, role: 'agent' | 'customer', text: string): void {
  state.conversationHistory.push({ role, text, timestamp: new Date().toISOString() } as ConversationTurn);
  if (role === 'agent') state.lastAgentMessage = text;
}

function markField(state: QualificationState, field: EligibilityField): void {
  state.answeredFields.add(field);
}

// ── Session start ────────────────────────────────────────────
export function startSession(params: {
  customerName: string;
  agentName: string;
  companyName: string;
}): QualificationState {
  const state = createInitialState();
  state.qualificationStatus = 'verifying';
  const greeting = `Hello, may I please speak with ${params.customerName}? This is ${params.agentName} calling from ${params.companyName}.`;
  addTurn(state, 'agent', greeting);
  sessions.set(state.sessionId, state);
  return state;
}

// ── Main entry ───────────────────────────────────────────────
export function processUtterance(state: QualificationState, utterance: string): string {
  addTurn(state, 'customer', utterance);

  // Already terminated — no further questions
  if (isTerminated(state)) {
    const reply = "I believe we've completed our conversation. Please do not hesitate to call us if you need any further assistance. Have a great day!";
    addTurn(state, 'agent', reply);
    return reply;
  }

  const facts = extractFacts(utterance, state);

  // ── Verification ─────────────────────────────────────────
  if (state.qualificationStatus === 'verifying') {
    return handleVerification(state, facts);
  }

  // ── Busy (can fire at any stage) ─────────────────────────
  if (state.customerBusy || facts.customerBusy) {
    return handleBusy(state, facts);
  }

  // ── Offer presentation ───────────────────────────────────
  if (state.qualificationStatus === 'presenting_offer') {
    return handleOfferPresentation(state, facts);
  }

  // ── Loan-cap decision ─────────────────────────────────────
  if (state.qualificationStatus === 'pending_loan_cap_decision') {
    return handleLoanCapDecision(state, facts);
  }

  // ── Eligibility collection ────────────────────────────────
  if (state.qualificationStatus === 'collecting_eligibility' ||
      state.qualificationStatus === 'not_started') {
    return handleEligibilityCollection(state, facts);
  }

  const fallback = "I'm sorry, I didn't quite catch that. Could you please repeat?";
  addTurn(state, 'agent', fallback);
  return fallback;
}

// ── Stage: Verification ──────────────────────────────────────
function handleVerification(state: QualificationState, facts: ExtractedFacts): string {
  if (facts.customerBusy) return handleBusy(state, facts);

  if (facts.genericYes) {
    state.customerVerified = true;
    state.qualificationStatus = 'presenting_offer';
    const offer =
      "Wonderful! Thank you, and I hope you're having a great day. The reason for my call today is that, as one of our valued existing customers, you have been pre-approved for a special Loan Against Property offer of up to ₹75 lakhs. I'd just like to ask you a few quick questions to confirm whether this offer is suitable for you. Would that be okay?";
    addTurn(state, 'agent', offer);
    return offer;
  }

  if (facts.genericNo) {
    state.qualificationStatus = 'completed';
    state.callOutcome = 'error';
    state.terminationReason = 'Customer not reached / wrong person.';
    const msg = "I'm sorry to bother you. I was looking to speak with the account holder. Have a great day!";
    addTurn(state, 'agent', msg);
    return msg;
  }

  const clarify = "I'm calling from the Home Credit team regarding a special pre-approved offer on your account. Could I confirm — am I speaking with the right person?";
  addTurn(state, 'agent', clarify);
  return clarify;
}

// ── Stage: Busy ──────────────────────────────────────────────
function handleBusy(state: QualificationState, facts: ExtractedFacts): string {
  state.customerBusy = true;
  state.qualificationStatus = 'callback_requested';
  state.callOutcome = 'callback_requested';

  if (facts.callbackTime && !state.callbackTime) {
    state.callbackTime = facts.callbackTime;
    state.terminationReason = `Callback requested at ${facts.callbackTime}.`;
    const msg = `Absolutely, no problem at all. I've noted your preferred callback time as ${facts.callbackTime}. We will reach out to you then. Have a great day!`;
    addTurn(state, 'agent', msg);
    return msg;
  }

  const ask = "Absolutely, no problem at all. What would be a convenient time for us to call you back?";
  addTurn(state, 'agent', ask);
  return ask;
}

// ── Stage: Offer Presentation ─────────────────────────────────
function handleOfferPresentation(state: QualificationState, facts: ExtractedFacts): string {
  if (facts.customerBusy) return handleBusy(state, facts);
  if (facts.existingLoan || facts.emiReduction) return handleTransfer(state);

  // Handle interest-rate diversion
  if (facts.interestRateDiversion) {
    const divert = "The exact interest rate will be provided by our senior loan expert after the preliminary qualification. For now, may I ask just a few quick eligibility questions?";
    addTurn(state, 'agent', divert);
    return divert;
  }

  // Move into eligibility collection — apply any proactive facts they shared
  state.qualificationStatus = 'collecting_eligibility';
  applyFacts(state, facts);

  const disqual = checkDisqualification(state);
  if (disqual) return applyDisqualification(state, disqual);

  const next = getNextMissingItem(state);
  if (next === null) return finishQualification(state);
  state.nextQuestion = next;
  const question = getQuestion(next, state);
  addTurn(state, 'agent', question);
  return question;
}

// ── Stage: Loan Cap Decision ──────────────────────────────────
function handleLoanCapDecision(state: QualificationState, facts: ExtractedFacts): string {
  if (facts.loanCapAccepted === true) {
    state.requestedLoanAmount = MAX_LOAN_AMOUNT;
    state.loanAmountCapAccepted = true;
    markField(state, 'requestedLoanAmount');
    state.qualificationStatus = 'collecting_eligibility';

    const next = getNextMissingItem(state);
    if (next === null) return finishQualification(state);
    state.nextQuestion = next;
    const msg = `Great, I've updated the loan amount to ₹75 lakhs. ${getQuestion(next, state)}`;
    addTurn(state, 'agent', msg);
    return msg;
  }

  if (facts.loanCapAccepted === false) {
    state.loanAmountCapAccepted = false;
    state.disqualified = true;
    state.qualificationStatus = 'disqualified';
    state.callOutcome = 'disqualified';
    state.terminationReason = 'Customer declined to proceed with the ₹75 lakh maximum loan amount.';
    const msg = "I completely understand. Since the maximum loan amount under this offer is ₹75 lakhs and you require a higher amount, I'm unable to proceed further at this time. Thank you so much for your time and have a great day!";
    addTurn(state, 'agent', msg);
    return msg;
  }

  const retry = "Just to confirm — the maximum available under this offer is ₹75 lakhs. Would you like to proceed with that amount, or would you prefer not to?";
  addTurn(state, 'agent', retry);
  return retry;
}

// ── Stage: Eligibility Collection ────────────────────────────
function handleEligibilityCollection(state: QualificationState, facts: ExtractedFacts): string {
  if (facts.customerBusy) return handleBusy(state, facts);
  if (facts.existingLoan || facts.emiReduction) return handleTransfer(state);

  // Handle interest-rate diversion — answer briefly, then return to checklist
  if (facts.interestRateDiversion) {
    const next = getNextMissingItem(state);
    const returnQ = next ? ` For now, may I continue? ${getQuestion(next, state)}` : '';
    const divert = `The exact interest rate will be provided by our senior loan expert after the preliminary qualification.${returnQ}`;
    addTurn(state, 'agent', divert);
    return divert;
  }

  applyFacts(state, facts);

  // Loan cap check
  if (
    state.requestedLoanAmount !== null &&
    state.requestedLoanAmount > MAX_LOAN_AMOUNT &&
    state.loanAmountCapAccepted === null
  ) {
    state.qualificationStatus = 'pending_loan_cap_decision';
    const capMsg = getLoanCapQuestion(state.requestedLoanAmount);
    addTurn(state, 'agent', capMsg);
    return capMsg;
  }

  // Business rules
  const disqual = checkDisqualification(state);
  if (disqual) return applyDisqualification(state, disqual);

  // Next missing question
  const next = getNextMissingItem(state);
  if (next === null) return finishQualification(state);
  state.nextQuestion = next;
  const question = getQuestion(next, state);
  addTurn(state, 'agent', question);
  return question;
}

// ── Utilities ─────────────────────────────────────────────────

function applyFacts(state: QualificationState, facts: ExtractedFacts): void {
  if (facts.propertyType && facts.propertyType !== 'unknown') {
    state.propertyType = facts.propertyType;
    markField(state, 'propertyType');
  }
  if (facts.ownershipStatus && facts.ownershipStatus !== 'unknown') {
    state.ownershipStatus = facts.ownershipStatus;
    markField(state, 'ownershipStatus');
  }
  if (facts.originalDocumentsAvailable !== undefined) {
    state.originalDocumentsAvailable = facts.originalDocumentsAvailable;
    markField(state, 'originalDocumentsAvailable');
  }
  if (facts.requestedLoanAmount !== undefined && facts.requestedLoanAmount > 0) {
    state.requestedLoanAmount = facts.requestedLoanAmount;
    if (facts.requestedLoanAmount <= MAX_LOAN_AMOUNT) {
      markField(state, 'requestedLoanAmount');
    }
  }
  if (facts.occupation && facts.occupation !== 'unknown') {
    state.occupation = facts.occupation;
    markField(state, 'occupation');
  }
  if (facts.incomeMode && facts.incomeMode !== 'unknown') {
    state.incomeMode = facts.incomeMode;
    markField(state, 'incomeMode');
  }
  if (facts.propertyMarketValue !== undefined && facts.propertyMarketValue > 0) {
    state.propertyMarketValue = facts.propertyMarketValue;
    markField(state, 'propertyMarketValue');
  }
  if (facts.tenureYears !== undefined && facts.tenureYears > 0) {
    state.tenureYears = facts.tenureYears;
    markField(state, 'tenureYears');
  }
  if (facts.existingLoan !== undefined) state.existingPropertyLoan = facts.existingLoan;
  if (facts.emiReduction !== undefined) state.emiReductionRequest = facts.emiReduction;
  if (facts.callbackTime !== undefined) state.callbackTime = facts.callbackTime;
}

function applyDisqualification(state: QualificationState, reason: string): string {
  state.disqualified = true;
  state.qualificationStatus = 'disqualified';
  state.callOutcome = 'disqualified';
  state.terminationReason = reason;
  const msg =
    DISQUAL_MESSAGES[reason as keyof typeof DISQUAL_MESSAGES] ??
    "I'm sorry, but based on the information provided, you don't meet the criteria for this offer. Thank you for your time.";
  addTurn(state, 'agent', msg);
  return msg;
}

function handleTransfer(state: QualificationState): string {
  state.transferRequired = true;
  state.existingPropertyLoan = state.existingPropertyLoan ?? true;
  state.qualificationStatus = 'transfer_required';
  state.callOutcome = 'transfer_required';
  state.terminationReason = 'Customer has an existing loan on the property or requested EMI reduction.';
  addTurn(state, 'agent', TRANSFER_MESSAGE);
  return TRANSFER_MESSAGE;
}

function finishQualification(state: QualificationState): string {
  state.qualificationStatus = 'qualified';
  state.callOutcome = 'eligible';
  addTurn(state, 'agent', QUALIFIED_HANDOFF_MESSAGE);
  return QUALIFIED_HANDOFF_MESSAGE;
}

function isTerminated(state: QualificationState): boolean {
  return ['disqualified', 'transfer_required', 'callback_requested', 'qualified', 'completed']
    .includes(state.qualificationStatus);
}
