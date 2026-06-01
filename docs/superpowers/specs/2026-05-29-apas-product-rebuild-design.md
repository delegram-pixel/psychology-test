# APAS Product Rebuild — Design Spec
**Date:** 2026-05-29  
**Status:** Approved  

---

## Overview

Replace the hardcoded pitch demo with a real multi-tenant clinical SaaS. Each psychologist has an isolated account, manages their own patient caseload, creates assessment sessions, and sends questionnaire links to patients. Results flow back into the psychologist's dashboard automatically.

The existing stack (Next.js App Router, Prisma, PostgreSQL, NextAuth) is retained. The UI is rebuilt with shadcn/ui and 21st.dev components, preserving the existing clinical color palette and design language.

---

## Goals

- Psychologists can register, verify their email, and log in
- Each psychologist sees only their own patients and data (multi-tenant isolation)
- Psychologists can create anonymous patient records and assessment sessions
- Patients receive a magic link, fill a questionnaire, and submit — no account needed
- Results populate the psychologist's dashboard with scores, severity, and alerts
- AI narrative (Claude API) is fed real response data, not hardcoded values

## Out of Scope (deferred)

- Custom questionnaire builder (validated scales only: PHQ-9, GAD-7, BDI-II)
- Patient-facing history or account portal
- Email sending infrastructure (psychologist copies and sends links manually)
- CSV batch import / Upload & Score screen
- Admin panel or cross-tenant reporting

---

## Database Schema

Four models added to Prisma. All patient data is isolated per psychologist via `psychologistId` foreign keys.

### `User` (psychologist)
```prisma
model User {
  id                       String    @id @default(cuid())
  email                    String    @unique
  passwordHash             String
  name                     String
  emailVerified            DateTime?
  verificationToken        String?   @unique
  verificationTokenExpiry  DateTime?
  createdAt                DateTime  @default(now())
  patients                 Patient[]
  sessions                 AssessmentSession[]
}
```

### `Patient`
```prisma
model Patient {
  id             String    @id @default(cuid())
  displayName    String                        // e.g. "John D." or "Patient 007"
  anonymousId    String    @unique             // auto-generated per-psychologist sequential ID e.g. "P-001". Each psychologist has their own P-001.
  psychologistId String
  psychologist   User      @relation(fields: [psychologistId], references: [id])
  sessions       AssessmentSession[]
  createdAt      DateTime  @default(now())
}
```

### `AssessmentSession`
```prisma
model AssessmentSession {
  id             String    @id @default(cuid())
  patientId      String
  patient        Patient   @relation(fields: [patientId], references: [id])
  psychologistId String
  psychologist   User      @relation(fields: [psychologistId], references: [id])
  scale          Scale                         // enum: PHQ9 | BDI2 | GAD7
  status         SessionStatus                 // enum: PENDING | COMPLETED | EXPIRED
  token          String    @unique             // UUID for magic link
  tokenExpiresAt DateTime
  response       QuestionnaireResponse?
  createdAt      DateTime  @default(now())
}
```

### `QuestionnaireResponse`
```prisma
model QuestionnaireResponse {
  id          String    @id @default(cuid())
  sessionId   String    @unique
  session     AssessmentSession @relation(fields: [sessionId], references: [id])
  itemScores  Json                            // { "1": 2, "2": 3, ... }
  totalScore  Int
  severity    String
  completedAt DateTime  @default(now())
}
```

### Enums
```prisma
enum Scale {
  PHQ9
  BDI2
  GAD7
}

enum SessionStatus {
  PENDING
  COMPLETED
  EXPIRED
}
```

---

## Auth Design

### Psychologist Auth (NextAuth Credentials)
- Registration: `/auth/signup` — name, email, password. Password hashed with bcrypt.
- On registration: generate a 24-hour email verification token, store on the User record, send link to `/auth/verify-email?token=...`
- Until `emailVerified` is set: login blocked with "Please verify your email" message
- On first login after verification: redirect to dashboard with empty-state onboarding prompt

### Patient Magic Links
- On session creation: generate a `crypto.randomUUID()` token stored on `AssessmentSession`
- Token expires 72 hours from creation
- Link format: `[domain]/fill/[token]`
- On questionnaire submit: token is invalidated (session status → COMPLETED)
- Expired or used tokens: render a clear "This link is no longer valid" screen

---

## Routes

### Psychologist-Facing (authenticated)
| Route | Description |
|---|---|
| `/auth/signup` | Registration form |
| `/auth/signin` | Login form |
| `/auth/verify-email` | Email verification handler |
| `/dashboard` | Overview: stats, alerts, caseload table |
| `/patients` | Patient list + "New Patient" button |
| `/patients/[id]` | Patient profile: session history, score chart, trend flags |
| `/patients/[id]/sessions/[sessionId]` | Session detail: item responses, AI narrative, action buttons |

### Patient-Facing (token-authenticated, no account)
| Route | Description |
|---|---|
| `/fill/[token]` | Questionnaire form |
| `/fill/[token]/complete` | Thank you screen after submission |

---

## Feature Flows

### 1 — Psychologist Onboarding
1. Visit `/auth/signup` → fill name, email, password
2. Verification email sent (token link, 24h expiry)
3. Click link → email verified → redirect to `/dashboard`
4. Empty dashboard shows: "No patients yet. Add your first patient to get started."

### 2 — Patient & Session Creation
1. Psychologist clicks "New Patient" → modal: enter display name → Patient created, anonymous ID auto-assigned
2. Psychologist opens patient → clicks "New Session" → modal: select scale (PHQ-9 / GAD-7 / BDI-II)
3. System creates `AssessmentSession` with UUID token, status PENDING, expiry 72h
4. Magic link displayed with copy button
5. Psychologist sends link via their own channel

### 3 — Patient Questionnaire Completion
1. Patient opens `/fill/[token]`
2. Token validated (exists, not expired, not used) — if invalid: error screen
3. Scale questionnaire rendered (all items from existing `scales-data.ts`)
4. Patient selects responses → submits
5. `QuestionnaireResponse` created, session status → COMPLETED, token invalidated
6. Patient sees "Thank you" screen — no score shown

### 4 — Results & Alerts
1. Dashboard polling or on-load fetch pulls completed sessions
2. Alert rules computed server-side:
   - PHQ-9 total ≥ 20 → Critical
   - BDI-II total ≥ 29 → Critical
   - GAD-7 total ≥ 15 → High
   - PHQ-9 Item 9 > 0 → Suicidal ideation flag (always surfaced as top priority)
3. Alerts displayed in dashboard feed with severity badges
4. Trend computed across a patient's session history (worsening / stable / improving)

### 5 — AI Narrative
1. Psychologist opens a completed session
2. Page triggers Claude API call with real response data (same PII firewall as current demo — no IDs, no names, clinical data only)
3. Streaming narrative displayed
4. Critical banner shown if suicidal ideation flag is present
5. "Mark Reviewed" and "Escalate to Supervisor" action buttons

---

## UI Stack

- **shadcn/ui** — all form elements, dialogs, tables, badges, cards, navigation
- **21st.dev** — premium data visualization components (charts, stat cards, trend indicators)
- **Color palette preserved** from current demo:
  - Sidebar: dark navy `#0F172A`
  - Primary accent: indigo `#4F46E5`
  - Critical: red `#EF4444`
  - High: orange `#F97316`
  - Moderate: amber `#F59E0B`
  - Low / Improving: green `#22C55E`
- **Typography:** DM Sans (already in project), 14px base
- Flat, clinical aesthetic — no gradients, no shadows, no glassmorphism

---

## What Gets Removed

| Removed | Replaced by |
|---|---|
| Hardcoded `PARTICIPANTS` array | `Patient` + `AssessmentSession` DB records |
| Hardcoded `ALERTS` array | Computed from `QuestionnaireResponse` on load |
| Hardcoded `P001_ITEMS` | Real `itemScores` from DB |
| Upload & Score screen | Assessment sessions (deferred for later) |
| Single monolithic `page.tsx` (1,495 lines) | Per-route page components + shared components |

---

## Key Constraints

- **Multi-tenant isolation is mandatory** — all DB queries must filter by `psychologistId` from the authenticated session. No query may return patients or sessions belonging to another psychologist.
- **PII firewall on AI calls** — the Claude API prompt must never include display names, anonymous IDs, token values, or any identifying data. Clinical values only.
- **Token security** — magic link tokens are UUIDs, single-use, 72-hour TTL. Expired or used tokens render an error, never a questionnaire.
- **Email verification** — the `/dashboard` route must redirect to a "verify your email" page if `emailVerified` is null on the session user.
