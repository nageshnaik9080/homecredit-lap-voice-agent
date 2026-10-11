# Product Requirements Document (PRD)
## Home Credit — AI Voice Agent for Loan Against Property (LAP) Qualification

---

| Field | Details |
|---|---|
| **Product Name** | Home Credit LAP AI Voice Agent |
| **Version** | 1.0.0 |
| **Author** | Nagesh Naik |
| **Date** | October 2026 |
| **Status** | ✅ Complete & Tested |
| **Repository** | https://github.com/nageshnaik9080/homecredit-lap-voice-agent |

---

## 1. Executive Summary

Home Credit wants to reach thousands of existing customers and offer them a pre-approved **Loan Against Property (LAP)** of up to ₹75,00,000. Doing this manually through human agents is expensive, slow, and inconsistent.

This project delivers a fully automated **AI Voice Agent** that:
- Calls existing customers
- Explains the LAP offer
- Collects 7 eligibility data points through natural conversation
- Applies business rules in real-time
- Routes qualified leads to a senior loan expert
- Handles rejections, transfers, and callbacks automatically

---

## 2. Problem Statement

| Problem | Impact |
|---|---|
| Manual outbound calling is expensive | High cost per lead |
| Human agents are inconsistent | Business rules not always followed |
| Customers give out-of-order answers | Human agents re-ask already answered questions |
| No structured eligibility tracking | Leads not properly qualified |
| Transfer cases mixed with fresh loans | Wrong team handles the case |

---

## 3. Goals & Success Metrics

| Metric | Target | Achieved |
|---|---|---|
| All 7 eligibility fields captured | 100% | ✅ 100% |
| Business rules enforced | 0 violations | ✅ 0 violations |
| Out-of-order answer capture | Required | ✅ Implemented |
| Automated test coverage | 12 scenarios | ✅ 29 tests, 12 scenarios |
| Mock mode (no API key) | Required | ✅ Implemented |
| Test pass rate | 100% | ✅ 29/29 tests pass |

---

## 4. Complete Call Flow

```
START
  │
  ▼
GREETING & VERIFICATION
"Hello, may I speak with [Customer Name]?"
  │
  ├── BUSY? → Ask callback time → END (CALLBACK_REQUESTED)
  │
  ▼
PRESENT LAP OFFER
"You are pre-approved for up to ₹75 lakhs"
  │
  ├── TRANSFER/EMI? → "Specialist will call" → END (TRANSFER_REQUIRED)
  │
  ▼
ELIGIBILITY CHECKLIST (7 questions)
  │
  Q1: Property Type
  Q2: Ownership Status
  Q3: Original Documents
  Q4: Loan Amount
  Q5: Occupation + Income Mode
  Q6: Property Market Value
  Q7: Tenure
  │
  ├── ANY FAIL → Disqualify politely → END (DISQUALIFIED)
  │
  ▼
ALL PASS → Senior Loan Expert Handoff → END (ELIGIBLE)
```

---

## 5. The 7 Eligibility Rules

| # | Field | Eligible | Disqualify |
|---|---|---|---|
| 1 | Property Type | Residential, Commercial, Industrial | Agricultural → ❌ |
| 2 | Ownership | Sole, Joint | None — both pass |
| 3 | Documents | Originals available | Only photocopies → ❌ |
| 4 | Loan Amount | ≤ ₹75,00,000 | > ₹75L → offer cap |
| 5 | Occupation + Income | Any + Bank | Any + Cash → ❌ |
| 6 | Market Value | Any value | No minimum — capture only |
| 7 | Tenure | 3–15 years | < 3 or > 15 years → ❌ |

---

## 6. First-Missing-Question Algorithm

```
After every customer utterance:
  Step 1: EXTRACT   — Read every fact from the message
  Step 2: STORE     — Save all valid facts (even out-of-order)
  Step 3: TRANSFER  — Check for existing loan / EMI intent
  Step 4: DISQUALIFY — Apply business rules immediately
  Step 5: RESOLVE   — Handle pending loan-cap decision
  Step 6: FIND GAP  — Identify first unanswered checklist item
  Step 7: ASK       — Ask only that one question
```

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js v24 + TypeScript + Express |
| Validation | Zod |
| NLP Engine | Custom regex patterns |
| Testing | Vitest |
| Frontend | React 18 + TypeScript + Vite |
| Voice Platform | Retell AI (optional, mock mode available) |

---

## 8. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/session/start` | Start a new call session |
| POST | `/api/session/message` | Send utterance, get agent response |
| GET | `/api/session/:id` | Get session state |
| GET | `/api/scenarios` | List 12 test scenarios |
| POST | `/api/scenarios/:id/run` | Run one scenario |
| POST | `/api/scenarios/run-all` | Run all 12 scenarios |
| GET | `/api/prompt` | View full system prompt |
| GET | `/api/voice-provider/status` | Check Retell AI status |
| POST | `/api/webhook/retell` | Receive Retell call events |

---

## 9. Test Results

**29/29 unit tests passing**
**12/12 scenario tests passing**

| Scenario | Expected | Result |
|---|---|---|
| Fully eligible customer | eligible | ✅ |
| Agricultural property | disqualified | ✅ |
| Cash income | disqualified | ✅ |
| Missing documents | disqualified | ✅ |
| Tenure too short | disqualified | ✅ |
| Tenure too long | disqualified | ✅ |
| ₹90L → accept ₹75L cap | eligible | ✅ |
| Joint ownership | eligible | ✅ |
| Existing loan | transfer_required | ✅ |
| EMI reduction | transfer_required | ✅ |
| Out-of-order answers | eligible | ✅ |
| Busy customer | callback_requested | ✅ |

---

## 10. How to Run

```bash
# Install (one time)
cd backend  && npm install
cd frontend && npm install

# Start backend → http://localhost:4000
cd backend && npm run dev

# Start frontend → http://localhost:5173
cd frontend && npm run dev

# Run tests
cd backend && npm test
```

---

## 11. Submission Checklist

- ✅ Complete system prompt with all variables
- ✅ All 7 eligibility questions and rules
- ✅ Out-of-order answer capture
- ✅ Immediate disqualification on any failure
- ✅ Transfer / EMI reduction branch
- ✅ Busy customer callback branch
- ✅ Loan amount cap logic (₹75L max)
- ✅ Handoff gate — only after all 7 items pass
- ✅ No invented interest rates or thresholds
- ✅ Natural conversation handling
- ✅ 29/29 automated tests passing
- ✅ React frontend demo dashboard
- ✅ GitHub repository pushed
- ✅ README, Approach doc, PRD
