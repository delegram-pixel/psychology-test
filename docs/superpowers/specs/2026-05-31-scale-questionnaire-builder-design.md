# Scale & Questionnaire Builder — Design Spec
**Date:** 2026-05-31
**Status:** Approved

---

## Overview

Replace the hardcoded 3-scale enum system with a fully database-driven scale model. Psychologists can browse a pre-built library of validated scales (PHQ-9, GAD-7, BDI-II, AUDIT, DASS-21, PCL-5) and create their own custom questionnaires with multiple question types and psychologist-defined scoring rules. All scales — library and custom — use the same unified data model and questionnaire engine.

---

## Goals

- Psychologists can browse a library of validated scales and use them in sessions
- Psychologists can build custom questionnaires with multiple question types
- Custom questionnaires support psychologist-defined scoring rules and severity thresholds
- The patient-facing questionnaire form dynamically renders any scale
- Existing sessions (PHQ-9, GAD-7, BDI-II) are migrated to the new model

## Out of Scope

- Sharing custom scales between psychologists
- Versioning or locking scales after responses have been collected
- Importing scales from external formats (CSV, JSON)

---

## Data Model

### New models

```prisma
model Scale {
  id                  String               @id @default(cuid())
  name                String
  description         String?
  psychologistId      String?              // null = library scale (visible to all)
  isLibrary           Boolean              @default(false)
  createdAt           DateTime             @default(now())
  psychologist        User?                @relation(fields: [psychologistId], references: [id], onDelete: Cascade)
  items               ScaleItem[]
  thresholds          SeverityThreshold[]
  assessmentSessions  AssessmentSession[]
}

model ScaleItem {
  id              String           @id @default(cuid())
  scaleId         String
  scale           Scale            @relation(fields: [scaleId], references: [id], onDelete: Cascade)
  order           Int
  text            String
  type            ItemType
  required        Boolean          @default(true)
  options         ResponseOption[]
}

model ResponseOption {
  id          String    @id @default(cuid())
  itemId      String
  item        ScaleItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  label       String
  value       Int?      // null for FREE_TEXT items
  order       Int
}

model SeverityThreshold {
  id        String  @id @default(cuid())
  scaleId   String
  scale     Scale   @relation(fields: [scaleId], references: [id], onDelete: Cascade)
  label     String  // e.g. "Mild", "Moderate", "Severe"
  minScore  Int
  maxScore  Int
}

enum ItemType {
  MULTIPLE_CHOICE
  YES_NO
  FREE_TEXT
  NUMBER
}
```

### Modified models

```prisma
model AssessmentSession {
  // Replace:  scale  Scale (old enum)
  // With:
  scaleId   String
  scale     Scale  @relation(fields: [scaleId], references: [id])
  // All other fields unchanged
}
```

The old `Scale` enum (PHQ9 / BDI2 / GAD7) and `SessionStatus` enum are removed. `SessionStatus` stays.

### User model addition

```prisma
model User {
  // Add:
  scales  Scale[]
}
```

---

## Library Scales (Seeded)

Six validated scales seeded as library records (`isLibrary: true`, `psychologistId: null`):

| Scale | Items | Score Range | Thresholds |
|---|---|---|---|
| PHQ-9 | 9 × MULTIPLE_CHOICE (0–3) | 0–27 | None/Minimal 0–4, Mild 5–9, Moderate 10–14, Mod-Severe 15–19, Severe 20–27 |
| GAD-7 | 7 × MULTIPLE_CHOICE (0–3) | 0–21 | Minimal 0–4, Mild 5–9, Moderate 10–14, Severe 15–21 |
| BDI-II | 21 × MULTIPLE_CHOICE (0–3) | 0–63 | Minimal 0–13, Mild 14–19, Moderate 20–28, Severe 29–63 |
| AUDIT | 10 × MULTIPLE_CHOICE (0–4) | 0–40 | Low 0–7, Hazardous 8–15, Harmful 16–19, Dependent 20–40 |
| DASS-21 | 21 × MULTIPLE_CHOICE (0–3) | 0–63 | Normal/Mild/Moderate/Severe/Extremely Severe per subscale |
| PCL-5 | 20 × MULTIPLE_CHOICE (0–4) | 0–80 | Minimal 0–20, Mild 21–32, Moderate 33–44, Severe 45–80 |

All library scales are read-only — psychologists can use them but cannot edit item text or scoring.

---

## Migration

Existing `AssessmentSession` records reference the old `Scale` enum values (PHQ9, BDI2, GAD7). A migration script:

1. Seeds library scales (PHQ-9, GAD-7, BDI-II first)
2. Updates existing sessions: `PHQ9` → PHQ-9 scale id, `BDI2` → BDI-II scale id, `GAD7` → GAD-7 scale id
3. Drops the old `Scale` enum column, adds `scaleId` FK

---

## New Routes

### Pages

| Route | Description |
|---|---|
| `/scales` | Two tabs: "Library" (all `isLibrary` scales) and "My Scales" (psychologist's custom). "Use scale" button on library items. "Create new" button. |
| `/scales/new` | Scale builder wizard: step 1 name+description, step 2 add items, step 3 add thresholds. |
| `/scales/[id]` | View scale detail. Custom scales: editable. Library scales: read-only with "Use in session" button. |

**Sidebar:** Add "Scales" nav link between Dashboard and Patients.

### API Endpoints

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/scales` | GET | Psychologist | Returns library scales + own custom scales |
| `/api/scales` | POST | Psychologist | Create custom scale (name, description) |
| `/api/scales/[id]` | GET | Psychologist | Scale + items + options + thresholds |
| `/api/scales/[id]` | PATCH | Owner only | Update name/description |
| `/api/scales/[id]/items` | POST | Owner only | Add item to scale |
| `/api/scales/[id]/items/[itemId]` | PATCH | Owner only | Update item text/type/order |
| `/api/scales/[id]/items/[itemId]` | DELETE | Owner only | Remove item |
| `/api/scales/[id]/thresholds` | POST | Owner only | Add severity threshold |
| `/api/scales/[id]/thresholds/[thresholdId]` | PATCH | Owner only | Update threshold |
| `/api/scales/[id]/thresholds/[thresholdId]` | DELETE | Owner only | Remove threshold |

### Modified Endpoints

**`POST /api/patients/[id]/sessions`**
- `scale` field (old enum string) → `scaleId` (Scale DB record id)

**`GET /api/fill/[token]`**
- Returns: `{ scale: { id, name, items: [{ id, order, text, type, options: [{ label, value }] }] } }`

**`POST /api/fill/[token]`**
- `totalScore` computed from numeric items only (MULTIPLE_CHOICE, YES_NO, NUMBER)
- FREE_TEXT answers stored as strings in `itemScores` JSON
- `severity` looked up from `SeverityThreshold` records — finds the threshold where `totalScore >= minScore && totalScore <= maxScore`

---

## UI Flows

### Using a library scale

1. Psychologist goes to `/scales` → Library tab
2. Clicks "Use scale" on PHQ-9 → this scale is now available in their session creation dropdown
3. When creating a session, PHQ-9 appears in the scale picker
4. Magic link sent to patient → patient sees PHQ-9 items rendered dynamically from DB

### Creating a custom questionnaire

1. Psychologist goes to `/scales` → "Create new"
2. Step 1: Enter name (e.g. "Weekly Mood Check") and description
3. Step 2: Add items one by one:
   - Select type (Multiple Choice / Yes/No / Free Text / Number)
   - Enter question text
   - For Multiple Choice: add answer options with point values
   - For Yes/No: values are auto-set (Yes=1, No=0)
   - Reorder items by drag or up/down arrows
4. Step 3: Add severity thresholds (optional):
   - Enter label, min score, max score
   - e.g. "Low: 0–5", "Medium: 6–10", "High: 11–20"
5. Save → scale appears under "My Scales" and in session creation

### Alert rules for custom scales

The existing `computeAlerts()` function uses hardcoded thresholds for PHQ9/BDI2/GAD7. For custom scales:
- Severity is determined by `SeverityThreshold` lookup at submit time
- Alerts shown on dashboard if severity threshold label contains "critical", "severe", or "high" (case-insensitive)
- Suicidal ideation flag: only applies to PHQ-9 (library scale, item 9)

---

## Components

### New
- `components/scales/scale-card.tsx` — card shown in library/my scales list
- `components/scales/scale-builder.tsx` — multi-step form for creating/editing a scale
- `components/scales/item-editor.tsx` — single item editing UI within the builder
- `components/scales/threshold-editor.tsx` — severity threshold input rows

### Modified
- `components/sessions/new-session-dialog.tsx` — scale picker fetches from `/api/scales` instead of hardcoded list
- `components/questionnaire/questionnaire-form.tsx` — fully dynamic rendering from DB items instead of hardcoded PHQ-9/GAD-7/BDI-II arrays
- `components/layout/sidebar.tsx` — add Scales nav link
- `lib/alert-rules.ts` — update `computeAlerts` to accept optional severity label from DB thresholds

---

## Key Constraints

- **Library scales are read-only** — no psychologist can edit items or thresholds on library scales
- **Owner-only writes** — PATCH/DELETE on custom scale items requires `psychologistId === session.user.id`
- **Scores only from numeric items** — FREE_TEXT answers are stored but excluded from `totalScore`
- **Threshold lookup is range-based** — if no threshold matches the score, severity = "unclassified"
- **Scale deletion is blocked** if sessions reference it — return 409 with a clear message

