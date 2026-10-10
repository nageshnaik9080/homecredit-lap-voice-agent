export interface ConversationTurn {
  role: 'agent' | 'customer';
  text: string;
  timestamp: string;
}

export interface QualificationState {
  sessionId: string;
  customerVerified: boolean | null;
  customerBusy: boolean | null;
  callbackTime: string | null;
  propertyType: string;
  ownershipStatus: string;
  originalDocumentsAvailable: boolean | null;
  requestedLoanAmount: number | null;
  occupation: string;
  incomeMode: string;
  propertyMarketValue: number | null;
  tenureYears: number | null;
  existingPropertyLoan: boolean | null;
  emiReductionRequest: boolean | null;
  loanAmountCapAccepted: boolean | null;
  disqualified: boolean;
  transferRequired: boolean;
  terminationReason: string | null;
  qualificationStatus: string;
  callOutcome: string;
  answeredFields: string[];
  nextQuestion: string | null;
  conversationHistory: ConversationTurn[];
  lastAgentMessage: string;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  customerName: string;
  utterances: string[];
  expectedOutcome: string;
  expectedCallOutcome: string;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  expectedOutcome: string;
  actualOutcome: string;
  passed: boolean;
  qualificationState: QualificationState;
  transcript: { role: string; text: string }[];
}

export interface RunAllResult {
  total: number;
  passed: number;
  failed: number;
  results: {
    id: string;
    name: string;
    expectedOutcome: string;
    actualOutcome: string;
    passed: boolean;
  }[];
}
