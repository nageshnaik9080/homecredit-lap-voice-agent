// ─────────────────────────────────────────────────────────────
// Core types for the LAP Qualification Engine
// ─────────────────────────────────────────────────────────────

export type PropertyType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'agricultural'
  | 'unknown';

export type OwnershipStatus = 'sole' | 'joint' | 'unknown';

export type IncomeMode = 'bank' | 'cash' | 'unknown';

export type Occupation = 'salaried' | 'self_employed' | 'unknown';

export type QualificationStatus =
  | 'not_started'
  | 'verifying'
  | 'presenting_offer'
  | 'collecting_eligibility'
  | 'pending_loan_cap_decision'
  | 'disqualified'
  | 'transfer_required'
  | 'callback_requested'
  | 'qualified'
  | 'completed';

export type CallOutcome =
  | 'pending'
  | 'eligible'
  | 'disqualified'
  | 'transfer_required'
  | 'callback_requested'
  | 'error';

export type EligibilityField =
  | 'propertyType'
  | 'ownershipStatus'
  | 'originalDocumentsAvailable'
  | 'requestedLoanAmount'
  | 'occupation'
  | 'incomeMode'
  | 'propertyMarketValue'
  | 'tenureYears';

/** The ordered list of the 7 checklist items */
export const ELIGIBILITY_CHECKLIST: EligibilityField[] = [
  'propertyType',
  'ownershipStatus',
  'originalDocumentsAvailable',
  'requestedLoanAmount',
  'occupation',       // #5 is occupation + incomeMode together
  'incomeMode',
  'propertyMarketValue',
  'tenureYears',
];

/** The canonical 7 checklist items (occupation + incomeMode counted as 1) */
export const CHECKLIST_ITEMS: (EligibilityField | 'occupationAndIncome')[] = [
  'propertyType',
  'ownershipStatus',
  'originalDocumentsAvailable',
  'requestedLoanAmount',
  'occupationAndIncome',
  'propertyMarketValue',
  'tenureYears',
];

export interface ConversationTurn {
  role: 'agent' | 'customer';
  text: string;
  timestamp: string;
}

export interface QualificationState {
  sessionId: string;

  // ── Verification ──
  customerVerified: boolean | null;
  customerBusy: boolean | null;
  callbackTime: string | null;

  // ── Eligibility fields ──
  propertyType: PropertyType;
  ownershipStatus: OwnershipStatus;
  originalDocumentsAvailable: boolean | null;
  requestedLoanAmount: number | null;       // in INR
  occupation: Occupation;
  incomeMode: IncomeMode;
  propertyMarketValue: number | null;       // in INR
  tenureYears: number | null;

  // ── Transfer / EMI ──
  existingPropertyLoan: boolean | null;
  emiReductionRequest: boolean | null;

  // ── Loan-cap decision ──
  loanAmountCapAccepted: boolean | null;    // true after customer agrees to ₹75L

  // ── Outcome ──
  disqualified: boolean;
  transferRequired: boolean;
  terminationReason: string | null;
  qualificationStatus: QualificationStatus;
  callOutcome: CallOutcome;

  // ── Navigation ──
  answeredFields: Set<EligibilityField>;
  nextQuestion: EligibilityField | 'occupationAndIncome' | null;

  // ── Conversation ──
  conversationHistory: ConversationTurn[];
  lastAgentMessage: string;
}

export interface ProcessUtteranceRequest {
  sessionId: string;
  utterance: string;
  customerName?: string;
  agentName?: string;
  agentGender?: string;
  companyName?: string;
  languageToSpeak?: string;
  additionalContextFromRag?: string;
}

export interface ProcessUtteranceResponse {
  sessionId: string;
  agentResponse: string;
  qualificationState: SerializableQualificationState;
}

/** JSON-safe version (Set → Array) */
export interface SerializableQualificationState
  extends Omit<QualificationState, 'answeredFields'> {
  answeredFields: EligibilityField[];
}

export interface StartSessionRequest {
  customerName: string;
  agentName?: string;
  agentGender?: string;
  companyName?: string;
  languageToSpeak?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  agentGreeting: string;
  qualificationState: SerializableQualificationState;
}
