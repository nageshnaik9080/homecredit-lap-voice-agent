# 🏠 Home Credit — AI Voice Agent for LAP Qualification

A complete implementation of the SalesAgents AI assignment: an AI Voice Agent for Home Credit that qualifies existing customers for a Loan Against Property (LAP) offer.

---

## ⚡ Quick Start (after installing Node.js)

### 1. Install Node.js
Download from https://nodejs.org — choose the **LTS** version. Run the installer with default settings.

### 2. Install & run the backend
```bash
cd backend
npm install
npm run dev
```
Backend starts at **http://localhost:4000**

### 3. Install & run the frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend opens at **http://localhost:5173**

### 4. Run the automated tests
```bash
cd backend
npm test
```

---

## 🧪 Mock Mode
By default `MOCK_MODE=true` — the app runs fully without any paid API keys.  
All calls are simulated. The UI clearly labels them as simulated.

---

## 📁 Project Structure
```
nageshproject/
├── backend/
│   ├── src/
│   │   ├── engine/          # Core conversation & eligibility logic
│   │   │   ├── conversationEngine.ts   # Main state machine
│   │   │   ├── extractor.ts            # NLP fact extractor
│   │   │   ├── eligibility.ts          # Business rules
│   │   │   ├── questions.ts            # Question templates
│   │   │   └── state.ts                # Session state factory
│   │   ├── api/routes.ts    # Express REST API
│   │   ├── prompts/         # Retell AI system prompt template
│   │   ├── adapters/        # Retell AI adapter (mock-safe)
│   │   ├── types/           # TypeScript types
│   │   └── data/            # Test scenarios
│   └── tests/               # Vitest automated tests
├── frontend/
│   └── src/
│       ├── App.tsx           # Main dashboard
│       ├── components/       # UI components
│       ├── api/client.ts     # API calls
│       └── types/            # Shared types
└── docs/                     # Documentation
```

---

## 🔑 Environment Variables

Copy `.env.example` to `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend port |
| `MOCK_MODE` | `true` | Run without API keys |
| `RETELL_API_KEY` | _(empty)_ | Retell AI key (optional) |
| `RETELL_AGENT_ID` | _(empty)_ | Retell agent ID (optional) |
| `COMPANY_NAME` | `Home Credit` | Company name for agent |
| `AGENT_NAME` | `Priya` | Agent's name |
| `AGENT_GENDER` | `female` | Agent gender (for Hindi grammar) |

---

## 🗣️ Retell AI Integration (Optional)

To enable real voice calls:
1. Sign up at https://retell.ai
2. Create an agent and copy your `AGENT_ID`
3. Copy your `API_KEY`
4. Set both in `backend/.env` and set `MOCK_MODE=false`
5. Use the system prompt from the **System Prompt** tab in the UI

---

## 🧪 Test Scenarios

12 scenarios covering every eligibility path:

| # | Scenario | Expected |
|---|---|---|
| 1 | Fully eligible customer | eligible |
| 2 | Agricultural property | disqualified |
| 3 | Cash income | disqualified |
| 4 | No original documents | disqualified |
| 5 | Tenure < 3 years | disqualified |
| 6 | Tenure > 15 years | disqualified |
| 7 | ₹90L loan → accept ₹75L cap | eligible |
| 8 | Joint ownership | eligible |
| 9 | Existing loan on property | transfer_required |
| 10 | EMI reduction request | transfer_required |
| 11 | Out-of-order answers | eligible |
| 12 | Busy customer | callback_requested |

---

## 📋 Business Rules Summary

- **Property**: Residential ✅ · Commercial ✅ · Industrial ✅ · Agricultural ❌
- **Ownership**: Sole ✅ · Joint ✅
- **Documents**: Originals available ✅ · Only photocopies ❌
- **Loan**: ≤ ₹75L ✅ · >₹75L → offer cap, customer decides
- **Income**: Bank ✅ · Cash ❌ (regardless of occupation)
- **Tenure**: 3–15 years ✅ · Outside range ❌
- **Transfer**: Existing loan / EMI reduction → specialist handoff
