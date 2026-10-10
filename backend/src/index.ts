// ─────────────────────────────────────────────────────────────
// Entry point — Express server
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './api/routes';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────────────┐
  │   Home Credit LAP Voice Agent — Backend          │
  │   Listening on http://localhost:${PORT}             │
  │   Mock mode: ${process.env.MOCK_MODE === 'true' ? 'ON  (no API keys required)' : 'OFF (Retell AI active)'}    │
  └──────────────────────────────────────────────────┘
  `);
});

export default app;
