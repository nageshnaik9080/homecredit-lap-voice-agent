// ─────────────────────────────────────────────────────────────
// Natural-language fact extractor  (v3 — all edge cases fixed)
// ─────────────────────────────────────────────────────────────

import {
  PropertyType,
  OwnershipStatus,
  Occupation,
  IncomeMode,
  QualificationState,
} from '../types';

export interface ExtractedFacts {
  customerBusy?: boolean;
  callbackTime?: string;
  existingLoan?: boolean;
  emiReduction?: boolean;
  propertyType?: PropertyType;
  ownershipStatus?: OwnershipStatus;
  originalDocumentsAvailable?: boolean;
  requestedLoanAmount?: number;
  occupation?: Occupation;
  incomeMode?: IncomeMode;
  propertyMarketValue?: number;
  tenureYears?: number;
  loanCapAccepted?: boolean;
  genericYes?: boolean;
  genericNo?: boolean;
  interestRateDiversion?: boolean;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[₹,]/g, '').replace(/\s+/g, ' ').trim();

// ─── Amount helpers ──────────────────────────────────────────

function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, '');

  const croreM = t.match(/(\d+(?:\.\d+)?)\s*crore/);
  if (croreM) return Math.round(parseFloat(croreM[1]) * 1_00_00_000);

  const lakhM = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (lakhM) return Math.round(parseFloat(lakhM[1]) * 1_00_000);

  // "seventy five lakhs"
  const wordLakhM = t.match(/([\w\s-]+?)\s+(?:lakh|lac)/);
  if (wordLakhM) {
    const n = wordsToNum(wordLakhM[1].trim());
    if (n) return n * 1_00_000;
  }

  const plain = t.match(/\b(\d{5,10})\b/);
  if (plain) return parseInt(plain[1], 10);

  return null;
}

const ONES: Record<string, number> = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
  ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,
  sixteen:16,seventeen:17,eighteen:18,nineteen:19,
};
const TENS: Record<string, number> = {
  twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,
};

function wordsToNum(s: string): number | null {
  const parts = s.split(/[\s-]+/);
  let total = 0, found = false;
  for (const p of parts) {
    if (ONES[p] !== undefined)  { total += ONES[p]; found = true; }
    else if (TENS[p] !== undefined) { total += TENS[p]; found = true; }
  }
  return found ? total : null;
}

// ─── Tenure helper ───────────────────────────────────────────
// Returns the LAST number of years mentioned (handles corrections)
function parseTenure(text: string): number | null {
  const t = text.toLowerCase();

  // All "N year(s)" occurrences — take the last
  const numericMatches = [...t.matchAll(/(\d+)\s*(?:year|yr)/g)];
  if (numericMatches.length > 0) {
    const last = numericMatches[numericMatches.length - 1];
    return parseInt(last[1], 10);
  }

  // Word numbers followed by "year(s)"
  const wordYearM = t.match(/([\w\s-]+?)\s+(?:year|yr)/g);
  if (wordYearM) {
    // take last match
    const lastW = wordYearM[wordYearM.length - 1];
    const wordPart = lastW.replace(/\s*(?:year|yr).*/, '').trim();
    const n = wordsToNum(wordPart);
    if (n !== null) return n;
  }

  // Bare word numbers anywhere (e.g. "twenty years" when "year" already consumed)
  const bareWordM = [...t.matchAll(/\b(twenty|fifteen|twelve|thirteen|fourteen|eleven|ten|nine|eight|seven|six|five|four|three|two|one)\b/g)];
  if (bareWordM.length > 0) {
    const all = { twenty:20,fifteen:15,twelve:12,thirteen:13,fourteen:14,
      eleven:11,ten:10,nine:9,eight:8,seven:7,six:6,five:5,four:4,three:3,two:2,one:1 };
    return all[bareWordM[bareWordM.length-1][1] as keyof typeof all] ?? null;
  }

  return null;
}

// ─── Main extractor ──────────────────────────────────────────

export function extractFacts(
  utterance: string,
  state: QualificationState,
): ExtractedFacts {
  const t = norm(utterance);
  const facts: ExtractedFacts = {};

  // ── Interest-rate diversion ──────────────────────────────
  if (/\b(interest\s*rate|rate of interest|what.*rate|rate.*offer)\b/.test(t)) {
    facts.interestRateDiversion = true;
  }

  // ── Busy / callback ──────────────────────────────────────
  if (/\b(busy|not (a good|the right) time|call (me )?back|later|bad time)\b/.test(t)) {
    facts.customerBusy = true;
    const th = utterance.match(
      /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|morning|afternoon|evening|tomorrow|tonight)\b/i,
    );
    if (th) facts.callbackTime = th[0];
  }

  // ── Transfer / EMI ───────────────────────────────────────
  if (/\b(already have a loan|existing loan|transfer|balance transfer)\b/.test(t)) {
    facts.existingLoan = true;
  }
  if (/\b(reduce|lower|cut)\b.*\b(emi|instalment|installment|monthly|payment)\b/.test(t) ||
      /\b(emi|instalment).*(reduce|lower|cut|less)\b/.test(t) ||
      /interested in reducing/.test(t)) {
    facts.emiReduction = true;
  }

  // ── Property type ────────────────────────────────────────
  if (/\b(residential|house|home|flat|apartment|villa|bungalow)\b/.test(t)) {
    facts.propertyType = 'residential';
  } else if (/\b(commercial|shop|office|showroom|warehouse)\b/.test(t)) {
    facts.propertyType = 'commercial';
  } else if (/\b(industrial|factory|plant|manufacturing)\b/.test(t)) {
    facts.propertyType = 'industrial';
  } else if (/\b(agricultural|farm|land|plot|khet)\b/.test(t)) {
    facts.propertyType = 'agricultural';
  }

  // ── Ownership ────────────────────────────────────────────
  if (/\b(jointly?|joint(ly)? owned|co(-| )own|shared with|together with|my wife|my husband|my brother|my sister|my partner)\b/.test(t)) {
    facts.ownershipStatus = 'joint';
  } else if (/\b(sole(ly)?|only (i|me|myself)|my (own|name)|single owner|i am the owner)\b/.test(t)) {
    facts.ownershipStatus = 'sole';
  } else if (/\b(mine|it.?s (mine|my house|my property))\b/.test(t) && !/joint/.test(t)) {
    facts.ownershipStatus = 'sole';
  }

  // ── Documents ────────────────────────────────────────────
  if (
    /\b(originals? (are |is )?(available|there|at home|with me|accessible))\b/.test(t) ||
    /\b(have the originals?|got the originals?|yes.{0,20}originals?|papers? available|documents? available)\b/.test(t)
  ) {
    facts.originalDocumentsAvailable = true;
  } else if (
    /\b(only (have |got )?photocop|photocopies|no original|don.?t have (the )?original|originals? (are )?(not|unavailable)|lost)\b/.test(t)
  ) {
    facts.originalDocumentsAvailable = false;
  }

  // ── Market value (before loan amount to avoid collisions) ──
  // Market value context: "worth", "value", "market", "property is worth/valued"
  const isMarketValueContext =
    /\b(worth|value(d)?|market (value|price)|priced at|current (value|price))\b/.test(t) ||
    state.nextQuestion === 'propertyMarketValue';

  if (isMarketValueContext) {
    const mv = parseAmount(utterance);
    if (mv !== null && mv > 0) {
      facts.propertyMarketValue = mv;
    }
  }

  // ── Loan amount ──────────────────────────────────────────
  // Extract when: explicit borrowing keyword, OR loan amount is next/current question,
  // OR we're collecting eligibility and market value context is absent.
  const isLoanAmountContext =
    /\b(need|want|looking for|require|borrow|loan amount|take)\b/.test(t) ||
    state.nextQuestion === 'requestedLoanAmount' ||
    (state.qualificationStatus === 'collecting_eligibility' &&
      state.requestedLoanAmount === null &&
      !isMarketValueContext);

  if (isLoanAmountContext && facts.propertyMarketValue === undefined) {
    const amt = parseAmount(utterance);
    if (amt !== null && amt > 0) {
      facts.requestedLoanAmount = amt;
    }
  }

  // ── Occupation ───────────────────────────────────────────
  if (
    /\b(salaried|job|employed|working (for|at|in)|service)\b/.test(t) &&
    !/self.?employed|business|freelanc/.test(t)
  ) {
    facts.occupation = 'salaried';
  } else if (
    /\b(self.?employed|business|entrepreneur|freelanc|run (a|my)|own (a|my))\b/.test(t)
  ) {
    facts.occupation = 'self_employed';
  }

  // ── Income mode ──────────────────────────────────────────
  if (/\b(bank|account|neft|credited|transferred|salary.*(in|to|into|via) bank|(in|to|into|via) (my )?bank)\b/.test(t)) {
    facts.incomeMode = 'bank';
  } else if (/\b(cash|in hand|hand cash|paid in cash)\b/.test(t)) {
    facts.incomeMode = 'cash';
  }

  // ── Tenure ───────────────────────────────────────────────
  // Extract when tenure keyword present, OR it is the next question,
  // OR we are actively collecting eligibility and tenure is still null
  const isTenureContext =
    /\b(year|yr|repay|tenure|period|duration)\b/.test(t) ||
    state.nextQuestion === 'tenureYears' ||
    (state.qualificationStatus === 'collecting_eligibility' && state.tenureYears === null);

  if (isTenureContext) {
    const tenure = parseTenure(utterance);
    if (tenure !== null) facts.tenureYears = tenure;
  }

  // ── Loan-cap acceptance ──────────────────────────────────
  if (state.qualificationStatus === 'pending_loan_cap_decision') {
    if (/\b(yes|ok|okay|sure|fine|alright|proceed|go ahead|that.?s fine|acceptable|agree|i.?ll go with|i.?ll take|i.?ll proceed)\b/.test(t)) {
      facts.loanCapAccepted = true;
    } else if (/\b(no|nope|not interested|don.?t want|decline|need more|won.?t work|not enough|require more|need higher|more than)\b/.test(t)) {
      facts.loanCapAccepted = false;
    }
  }

  // ── Generic yes / no ─────────────────────────────────────
  if (/^(yes|yeah|yep|yup|correct|that.?s (me|right)|speaking|this is|i am|sure|go ahead|ok(ay)?|tell me|proceed)\b/.test(t)) {
    facts.genericYes = true;
  }
  if (/^(no|nope|nah|not me|wrong number)\b/.test(t)) {
    facts.genericNo = true;
  }

  return facts;
}
