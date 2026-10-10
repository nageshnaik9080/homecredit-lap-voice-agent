// ─────────────────────────────────────────────────────────────
// Session state factory & serialization helpers
// ─────────────────────────────────────────────────────────────
import { randomUUID } from 'crypto';
const uuidv4 = () => randomUUID();
import {
  QualificationState,
  SerializableQualificationState,
  EligibilityField,
} from '../types';

export function createInitialState(sessionId?: string): QualificationState {
  return {
    sessionId: sessionId ?? uuidv4(),

    customerVerified: null,
    customerBusy: null,
    callbackTime: null,

    propertyType: 'unknown',
    ownershipStatus: 'unknown',
    originalDocumentsAvailable: null,
    requestedLoanAmount: null,
    occupation: 'unknown',
    incomeMode: 'unknown',
    propertyMarketValue: null,
    tenureYears: null,

    existingPropertyLoan: null,
    emiReductionRequest: null,
    loanAmountCapAccepted: null,

    disqualified: false,
    transferRequired: false,
    terminationReason: null,
    qualificationStatus: 'not_started',
    callOutcome: 'pending',

    answeredFields: new Set<EligibilityField>(),
    nextQuestion: 'propertyType',

    conversationHistory: [],
    lastAgentMessage: '',
  };
}

/** Convert Set→Array so the state can be sent as JSON */
export function serializeState(
  state: QualificationState,
): SerializableQualificationState {
  return {
    ...state,
    answeredFields: Array.from(state.answeredFields),
  };
}

/** Restore Set from the serialized form (used in tests) */
export function deserializeState(
  s: SerializableQualificationState,
): QualificationState {
  return {
    ...s,
    answeredFields: new Set(s.answeredFields as EligibilityField[]),
  };
}
