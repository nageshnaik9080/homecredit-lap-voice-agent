// ─────────────────────────────────────────────────────────────
// Eligibility business-rule evaluator
// Returns null if eligible, or a disqualification reason string.
// ─────────────────────────────────────────────────────────────

import { QualificationState } from '../types';

export type DisqualReason =
  | 'agricultural_property'
  | 'no_original_documents'
  | 'cash_income'
  | 'tenure_too_short'
  | 'tenure_too_long'
  | 'loan_amount_declined';

export const MAX_LOAN_AMOUNT = 75_00_000; // ₹75,00,000
export const MIN_TENURE = 3;
export const MAX_TENURE = 15;

/**
 * Evaluate whether the current state contains a disqualifying condition.
 * Returns the reason or null if OK.
 */
export function checkDisqualification(
  state: QualificationState,
): DisqualReason | null {
  if (state.propertyType === 'agricultural') return 'agricultural_property';
  if (state.originalDocumentsAvailable === false)
    return 'no_original_documents';
  if (state.incomeMode === 'cash') return 'cash_income';
  if (
    state.tenureYears !== null &&
    state.tenureYears < MIN_TENURE
  )
    return 'tenure_too_short';
  if (
    state.tenureYears !== null &&
    state.tenureYears > MAX_TENURE
  )
    return 'tenure_too_long';
  // Declined loan cap is handled separately
  return null;
}

/** Human-readable disqualification messages */
export const DISQUAL_MESSAGES: Record<DisqualReason, string> = {
  agricultural_property:
    "I'm sorry, but this particular Loan Against Property offer is only available for Residential, Commercial, or Industrial properties. Unfortunately, agricultural land does not qualify for this specific offer at this time. Thank you for your time, and I hope we can assist you with other products in the future.",
  no_original_documents:
    "I understand — unfortunately, original property documents are a mandatory requirement to proceed with this loan. Since the originals are not currently available, I'm unable to continue with the qualification at this time. If you are able to arrange the originals in the future, please do reach out to us. Thank you for your time.",
  cash_income:
    "Thank you for that information. Unfortunately, this particular offer requires income to be received through a bank account. Since your income is received in cash, you do not meet the eligibility criteria for this specific offer at this time. We appreciate your interest and hope to assist you in the future.",
  tenure_too_short:
    "I'm sorry, but the minimum repayment period for this loan offer is 3 years. The tenure you've mentioned is below that threshold, so I'm unable to proceed with this qualification. Thank you for your time.",
  tenure_too_long:
    "I'm sorry, but the maximum repayment period available under this offer is 15 years. The tenure you've mentioned exceeds that limit, so I'm unable to proceed with the qualification. Thank you for your time.",
  loan_amount_declined:
    "I understand. Since the maximum loan amount under this offer is ₹75 lakhs and you'd like a higher amount, I'm unable to proceed further with this qualification. Thank you for your time, and I hope we can assist you with other products in the future.",
};

/** Message when customer declines the ₹75L cap */
export const LOAN_CAP_DECLINED_MESSAGE = DISQUAL_MESSAGES.loan_amount_declined;

/** Message when all 7 items pass — handoff */
export const QUALIFIED_HANDOFF_MESSAGE =
  "Excellent! Based on the information you've shared, you appear to meet the preliminary eligibility criteria for our Loan Against Property offer. A senior loan expert from our team will call you back shortly to discuss the exact interest rates, final documentation, and next steps. Thank you so much for your time, and we look forward to assisting you further.";

/** Transfer message for existing loan / EMI reduction */
export const TRANSFER_MESSAGE =
  "Absolutely, I understand. Since you already have a loan on this property and are looking to transfer it or reduce your EMI, I'd like to route this to the right specialist. A loan transfer specialist from our team will contact you shortly to discuss the best options available to you. Thank you for your time.";
