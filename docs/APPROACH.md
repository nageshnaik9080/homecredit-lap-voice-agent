# Approach Document — LAP Voice Agent

## Core Algorithm: Extract → Validate → Update → Ask

After every customer utterance, the engine follows this exact sequence:

1. **Extract** — Parse every eligibility fact from the natural-language response
2. **Store** — Save all valid facts (even out-of-order ones)
3. **Detect transfer** — Check for existing loan / EMI-reduction intent
4. **Detect disqualification** — Apply all business rules immediately
5. **Resolve pending** — Handle loan-cap decisions if in progress
6. **Find next gap** — Identify the first unanswered checklist item
7. **Ask only that** — One focused question

## State Management

Every session maintains a `QualificationState` with typed fields for all 8 data points (occupation + income mode counted as one checklist item = 7 questions). Fields are initialized as `unknown`/`null` and only set from explicit customer confirmation.

## Out-of-Order Handling

The extractor scans the entire utterance for any eligibility facts regardless of what question was asked. Example:

> Customer: "It's a residential house, jointly owned with my wife, worth about ₹80 lakh."

Three facts extracted in one turn. The engine skips those questions and moves to Q3 (documents).

## Disqualification

Immediate, non-negotiable termination on:
- Agricultural property
- No original documents (only photocopies)
- Cash income
- Tenure < 3 or > 15 years
- Customer declines ₹75L cap

## Transfer Path

Separate branch — activated if customer mentions existing loan or EMI reduction at any point. Normal eligibility questions are not asked.
