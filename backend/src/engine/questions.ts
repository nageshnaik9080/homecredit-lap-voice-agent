// ─────────────────────────────────────────────────────────────
// Question templates for each eligibility checklist item
// ─────────────────────────────────────────────────────────────

import { EligibilityField, QualificationState } from '../types';
import { MAX_LOAN_AMOUNT } from './eligibility';

const FMT_LAKH = (n: number) => `₹${Math.round(n / 1_00_000)} lakh`;

/** Returns the agent question for the given field */
export function getQuestion(
  field: EligibilityField | 'occupationAndIncome',
  _state?: QualificationState,
): string {
  switch (field) {
    case 'propertyType':
      return "To get started, could you tell me about the property you'd like to use for this loan? Is it a Residential property such as a house or flat, a Commercial space like a shop or office, or an Industrial unit like a factory?";
    case 'ownershipStatus':
      return 'And are you the sole owner of this property, or is it jointly owned with a family member or partner?';
    case 'originalDocumentsAvailable':
      return 'Do you have the original property documents available for verification? They don\'t need to be with you right now — I just need to confirm they are accessible.';
    case 'requestedLoanAmount':
      return `How much would you be looking to borrow? Just to confirm, the maximum amount available under this offer is ${FMT_LAKH(MAX_LOAN_AMOUNT)}.`;
    case 'occupation':
      return 'Could you tell me a little about your occupation? Are you salaried — that is, working for a company — or are you self-employed, perhaps running your own business?';
    case 'incomeMode':
      return 'And is your income received through your bank account, or do you receive it in cash?';
    case 'occupationAndIncome':
      return 'Could you tell me about your occupation — are you salaried or self-employed — and whether your income is received through your bank account or in cash?';
    case 'propertyMarketValue':
      return 'Approximately what is the current market value of the property?';
    case 'tenureYears':
      return 'Finally, over how many years would you like to repay the loan? The available repayment period is between 3 and 15 years.';
    default:
      return 'Could you share a little more information so I can continue with your eligibility check?';
  }
}

/** Returns the loan-cap clarification question */
export function getLoanCapQuestion(requestedAmount: number): string {
  return `I see you're looking for ${FMT_LAKH(requestedAmount)}. The current offer is available for up to ${FMT_LAKH(MAX_LOAN_AMOUNT)}. Would you like to proceed with the maximum eligible amount of ${FMT_LAKH(MAX_LOAN_AMOUNT)}?`;
}

/**
 * Determine the next missing checklist item in order.
 * Returns null if all are answered (or terminated).
 */
export function getNextMissingItem(
  state: QualificationState,
): EligibilityField | 'occupationAndIncome' | null {
  const { answeredFields } = state;

  if (state.propertyType === 'unknown') return 'propertyType';
  if (state.ownershipStatus === 'unknown') return 'ownershipStatus';
  if (state.originalDocumentsAvailable === null) return 'originalDocumentsAvailable';
  if (state.requestedLoanAmount === null) return 'requestedLoanAmount';

  // Q5: occupation + income mode (counted as one checklist item)
  const occupationAnswered =
    state.occupation !== 'unknown' && answeredFields.has('occupation');
  const incomeModeAnswered =
    state.incomeMode !== 'unknown' && answeredFields.has('incomeMode');

  if (!occupationAnswered && !incomeModeAnswered) return 'occupationAndIncome';
  if (!occupationAnswered) return 'occupation';
  if (!incomeModeAnswered) return 'incomeMode';

  if (state.propertyMarketValue === null) return 'propertyMarketValue';
  if (state.tenureYears === null) return 'tenureYears';

  return null; // all answered
}
