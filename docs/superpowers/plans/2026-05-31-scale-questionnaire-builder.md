# Scale & Questionnaire Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 3-scale enum with a database-driven scale model, add a library of 6 validated scales, and let psychologists build custom questionnaires with multiple question types and scoring rules.

**Architecture:** New Prisma models (Scale, ScaleItem, ResponseOption, SeverityThreshold) replace the old Scale enum. A seed script populates 6 library scales. All UI components that referenced hardcoded PHQ-9/GAD-7/BDI-II are updated to fetch from the DB. A new `/scales` dashboard section covers library browsing and custom scale creation.

**Tech Stack:** Next.js 14 App Router, Prisma 5, PostgreSQL (Neon), NextAuth JWT, shadcn/ui, TypeScript, Jest

**UI Design Principle:** Dense, information-rich layouts. Tight padding (`p-4` not `p-8`), compact cards, no large empty areas. Every element earns its space.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `lib/scale-scoring.ts` | Pure scoring logic: sum numeric items, look up severity from thresholds |
| `lib/seed-scales.ts` | Static definitions for 6 library scales (items + options + thresholds) |
| `prisma/seed.ts` | Prisma seed script — runs seed-scales.ts against the DB |
| `app/api/scales/route.ts` | GET all scales, POST create custom scale |
| `app/api/scales/[id]/route.ts` | GET single scale with items, PATCH update, DELETE |
| `app/api/scales/[id]/items/route.ts` | POST add item to scale |
| `app/api/scales/[id]/items/[itemId]/route.ts` | PATCH update item, DELETE remove item |
| `app/api/scales/[id]/thresholds/route.ts` | POST add threshold |
| `app/api/scales/[id]/thresholds/[thresholdId]/route.ts` | PATCH update threshold, DELETE remove |
| `app/(dashboard)/scales/page.tsx` | Library + My Scales tabs |
| `app/(dashboard)/scales/new/page.tsx` | Scale builder page |
| `app/(dashboard)/scales/[id]/page.tsx` | Scale detail + edit page |
| `components/scales/scale-card.tsx` | Compact scale card used in lists |
| `components/scales/item-editor.tsx` | Single-item form (type, text, options) |
| `components/scales/threshold-editor.tsx` | Severity threshold rows |
| `__tests__/lib/scale-scoring.test.ts` | Tests for scoring utility |

### Modified files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add Scale, ScaleItem, ResponseOption, SeverityThreshold, ItemType enum; modify AssessmentSession |
| `components/layout/sidebar.tsx` | Add Scales nav link |
| `components/sessions/new-session-dialog.tsx` | Fetch scales from API instead of hardcoded list |
| `components/questionnaire/questionnaire-form.tsx` | Fully dynamic rendering from DB items |
| `app/api/patients/[id]/sessions/route.ts` | `scale` enum → `scaleId` FK |
| `app/api/fill/[token]/route.ts` | Return scale items from DB; dynamic scoring |
| `lib/alert-rules.ts` | Accept optional severity label for non-PHQ9 scales |

---

## Task 1: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace AssessmentSession and add new models**

Open `prisma/schema.prisma`. Make these changes:

**a) Add `ItemType` enum after `SessionStatus`:**
```prisma
enum ItemType {
  MULTIPLE_CHOICE
  YES_NO
  FREE_TEXT
  NUMBER
}
```

**b) Add `Scale` model after the `User` model:**
```prisma
model Scale {
  id                 String              @id @default(cuid())
  name               String
  description        String?
  psychologistId     String?
  isLibrary          Boolean             @default(false)
  createdAt          DateTime            @default(now())
  psychologist       User?               @relation(fields: [psychologistId], references: [id], onDelete: Cascade)
  items              ScaleItem[]
  thresholds         SeverityThreshold[]
  assessmentSessions AssessmentSession[]
}

model ScaleItem {
  id       String           @id @default(cuid())
  scaleId  String
  scale    Scale            @relation(fields: [scaleId], references: [id], onDelete: Cascade)
  order    Int
  text     String
  type     ItemType
  required Boolean          @default(true)
  options  ResponseOption[]
}

model ResponseOption {
  id     String    @id @default(cuid())
  itemId String
  item   ScaleItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  label  String
  value  Int?
  order  Int
}

model SeverityThreshold {
  id       String @id @default(cuid())
  scaleId  String
  scale    Scale  @relation(fields: [scaleId], references: [id], onDelete: Cascade)
  label    String
  minScore Int
  maxScore Int
}
```

**c) Add `scales` relation to `User` model:**
```prisma
model User {
  // existing fields...
  scales             Scale[]
  // existing relations...
}
```

**d) Modify `AssessmentSession` — replace `scale Scale` (enum) with `scaleId` FK:**

Remove:
```prisma
  scale          Scale
```

Add:
```prisma
  scaleId        String
  scale          Scale             @relation(fields: [scaleId], references: [id])
```

**e) Remove the old `Scale` enum entirely:**
```prisma
// DELETE this entire block:
enum Scale {
  PHQ9
  BDI2
  GAD7
}
```

- [ ] **Step 2: Run migration**

```bash
yarn prisma migrate dev --name "scale-questionnaire-builder"
```

If prompted about data loss on the `scale` column, accept (type `y`). Existing sessions will temporarily lose their scale reference — fixed in Task 3.

Expected: Migration applied, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Scale, ScaleItem, ResponseOption, SeverityThreshold models"
```

---

## Task 2: lib/scale-scoring.ts + tests

**Files:**
- Create: `lib/scale-scoring.ts`
- Create: `__tests__/lib/scale-scoring.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/scale-scoring.test.ts
import { computeNumericScore, lookupSeverity } from '@/lib/scale-scoring'

describe('computeNumericScore', () => {
  it('sums numeric values only', () => {
    const scores = { '1': 2, '2': 3, '3': 1 }
    expect(computeNumericScore(scores)).toBe(6)
  })

  it('ignores string values (free text)', () => {
    const scores = { '1': 2, '2': 'some text', '3': 1 }
    expect(computeNumericScore(scores as any)).toBe(3)
  })

  it('returns 0 for empty scores', () => {
    expect(computeNumericScore({})).toBe(0)
  })
})

describe('lookupSeverity', () => {
  const thresholds = [
    { label: 'Mild', minScore: 0, maxScore: 9 },
    { label: 'Moderate', minScore: 10, maxScore: 19 },
    { label: 'Severe', minScore: 20, maxScore: 27 },
  ]

  it('returns correct label for score in range', () => {
    expect(lookupSeverity(14, thresholds)).toBe('Moderate')
  })

  it('returns label for boundary scores', () => {
    expect(lookupSeverity(0, thresholds)).toBe('Mild')
    expect(lookupSeverity(27, thresholds)).toBe('Severe')
  })

  it('returns "unclassified" when no threshold matches', () => {
    expect(lookupSeverity(30, thresholds)).toBe('unclassified')
  })

  it('returns "unclassified" for empty thresholds', () => {
    expect(lookupSeverity(10, [])).toBe('unclassified')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn test __tests__/lib/scale-scoring.test.ts
```
Expected: `Cannot find module '@/lib/scale-scoring'`

- [ ] **Step 3: Implement**

```ts
// lib/scale-scoring.ts

export function computeNumericScore(
  itemScores: Record<string, number | string>
): number {
  return Object.values(itemScores).reduce<number>((sum, val) => {
    return typeof val === 'number' ? sum + val : sum
  }, 0)
}

export function lookupSeverity(
  score: number,
  thresholds: { label: string; minScore: number; maxScore: number }[]
): string {
  const match = thresholds.find(t => score >= t.minScore && score <= t.maxScore)
  return match?.label ?? 'unclassified'
}
```

- [ ] **Step 4: Run tests**

```bash
yarn test __tests__/lib/scale-scoring.test.ts
```
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/scale-scoring.ts __tests__/lib/scale-scoring.test.ts
git commit -m "feat: add scale scoring utility"
```

---

## Task 3: Seed library scales

**Files:**
- Create: `lib/seed-scales.ts`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma.seed config)

- [ ] **Step 1: Create seed-scales.ts**

```ts
// lib/seed-scales.ts

const FREQUENCY_OPTIONS = [
  { label: 'Not at all', value: 0, order: 0 },
  { label: 'Several days', value: 1, order: 1 },
  { label: 'More than half the days', value: 2, order: 2 },
  { label: 'Nearly every day', value: 3, order: 3 },
]

export const LIBRARY_SCALES = [
  {
    name: 'PHQ-9',
    description: 'Patient Health Questionnaire — 9-item depression screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'Little interest or pleasure in doing things', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 2, text: 'Feeling down, depressed, or hopeless', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 3, text: 'Trouble falling or staying asleep, or sleeping too much', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 4, text: 'Feeling tired or having little energy', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 5, text: 'Poor appetite or overeating', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 6, text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 8, text: 'Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself in some way', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
    ],
    thresholds: [
      { label: 'None–Minimal', minScore: 0, maxScore: 4 },
      { label: 'Mild', minScore: 5, maxScore: 9 },
      { label: 'Moderate', minScore: 10, maxScore: 14 },
      { label: 'Moderately Severe', minScore: 15, maxScore: 19 },
      { label: 'Severe', minScore: 20, maxScore: 27 },
    ],
  },
  {
    name: 'GAD-7',
    description: 'Generalised Anxiety Disorder — 7-item anxiety screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'Feeling nervous, anxious, or on edge', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 2, text: 'Not being able to stop or control worrying', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 3, text: 'Worrying too much about different things', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 4, text: 'Trouble relaxing', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 5, text: 'Being so restless that it is hard to sit still', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 6, text: 'Becoming easily annoyed or irritable', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 7, text: 'Feeling afraid as if something awful might happen', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
    ],
    thresholds: [
      { label: 'Minimal', minScore: 0, maxScore: 4 },
      { label: 'Mild', minScore: 5, maxScore: 9 },
      { label: 'Moderate', minScore: 10, maxScore: 14 },
      { label: 'Severe', minScore: 15, maxScore: 21 },
    ],
  },
  {
    name: 'BDI-II',
    description: 'Beck Depression Inventory — 21-item depression assessment',
    isLibrary: true,
    items: Array.from({ length: 21 }, (_, i) => ({
      order: i + 1,
      text: `BDI-II Item ${i + 1}`,
      type: 'MULTIPLE_CHOICE' as const,
      options: [
        { label: '0', value: 0, order: 0 },
        { label: '1', value: 1, order: 1 },
        { label: '2', value: 2, order: 2 },
        { label: '3', value: 3, order: 3 },
      ],
    })),
    thresholds: [
      { label: 'Minimal', minScore: 0, maxScore: 13 },
      { label: 'Mild', minScore: 14, maxScore: 19 },
      { label: 'Moderate', minScore: 20, maxScore: 28 },
      { label: 'Severe', minScore: 29, maxScore: 63 },
    ],
  },
  {
    name: 'AUDIT',
    description: 'Alcohol Use Disorders Identification Test — 10-item alcohol screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'How often do you have a drink containing alcohol?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Monthly or less', value: 1, order: 1 }, { label: '2–4 times a month', value: 2, order: 2 }, { label: '2–3 times a week', value: 3, order: 3 }, { label: '4+ times a week', value: 4, order: 4 }] },
      { order: 2, text: 'How many drinks containing alcohol do you have on a typical day when you are drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: '1–2', value: 0, order: 0 }, { label: '3–4', value: 1, order: 1 }, { label: '5–6', value: 2, order: 2 }, { label: '7–9', value: 3, order: 3 }, { label: '10+', value: 4, order: 4 }] },
      { order: 3, text: 'How often do you have 6 or more drinks on one occasion?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 4, text: 'How often during the last year have you found that you were not able to stop drinking once you had started?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 5, text: 'How often during the last year have you failed to do what was normally expected from you because of drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 6, text: 'How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 7, text: 'How often during the last year have you had a feeling of guilt or remorse after drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 8, text: 'How often during the last year have you been unable to remember what happened the night before because you had been drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 9, text: 'Have you or someone else been injured as a result of your drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'No', value: 0, order: 0 }, { label: 'Yes, but not in the last year', value: 2, order: 1 }, { label: 'Yes, during the last year', value: 4, order: 2 }] },
      { order: 10, text: 'Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?', type: 'MULTIPLE_CHOICE', options: [{ label: 'No', value: 0, order: 0 }, { label: 'Yes, but not in the last year', value: 2, order: 1 }, { label: 'Yes, during the last year', value: 4, order: 2 }] },
    ],
    thresholds: [
      { label: 'Low Risk', minScore: 0, maxScore: 7 },
      { label: 'Hazardous', minScore: 8, maxScore: 15 },
      { label: 'Harmful', minScore: 16, maxScore: 19 },
      { label: 'Dependence Likely', minScore: 20, maxScore: 40 },
    ],
  },
  {
    name: 'DASS-21',
    description: 'Depression Anxiety Stress Scales — 21-item measure',
    isLibrary: true,
    items: [
      { order: 1, text: 'I found it hard to wind down', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 2, text: 'I was aware of dryness of my mouth', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 3, text: 'I could not seem to experience any positive feeling at all', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 4, text: 'I experienced breathing difficulty', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 5, text: 'I found it difficult to work up the initiative to do things', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 6, text: 'I tended to over-react to situations', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 7, text: 'I experienced trembling (e.g. in the hands)', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 8, text: 'I felt that I was using a lot of nervous energy', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 9, text: 'I was worried about situations in which I might panic and make a fool of myself', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 10, text: 'I felt that I had nothing to look forward to', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 11, text: 'I found myself getting agitated', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 12, text: 'I found it difficult to relax', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 13, text: 'I felt down-hearted and blue', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 14, text: 'I was intolerant of anything that kept me from getting on with what I was doing', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 15, text: 'I felt I was close to panic', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 16, text: 'I was unable to become enthusiastic about anything', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 17, text: 'I felt I was not worth much as a person', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 18, text: 'I felt that I was rather touchy', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 19, text: 'I was aware of the action of my heart in the absence of physical exertion', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 20, text: 'I felt scared without any good reason', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 21, text: 'I felt that life was meaningless', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
    ],
    thresholds: [
      { label: 'Normal', minScore: 0, maxScore: 14 },
      { label: 'Mild', minScore: 15, maxScore: 28 },
      { label: 'Moderate', minScore: 29, maxScore: 42 },
      { label: 'Severe', minScore: 43, maxScore: 56 },
      { label: 'Extremely Severe', minScore: 57, maxScore: 63 },
    ],
  },
  {
    name: 'PCL-5',
    description: 'PTSD Checklist for DSM-5 — 20-item PTSD screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'Repeated, disturbing, and unwanted memories of the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 2, text: 'Repeated, disturbing dreams of the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 3, text: 'Suddenly feeling or acting as if the stressful experience were actually happening again', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 4, text: 'Feeling very upset when something reminded you of the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 5, text: 'Having strong physical reactions when something reminded you of the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 6, text: 'Avoiding memories, thoughts, or feelings related to the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 7, text: 'Avoiding external reminders of the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 8, text: 'Trouble remembering important parts of the stressful experience', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 9, text: 'Having strong negative beliefs about yourself, other people, or the world', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 10, text: 'Blaming yourself or someone else for the stressful experience or what happened after it', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 11, text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 12, text: 'Loss of interest in activities that you used to enjoy', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 13, text: 'Feeling distant or cut off from other people', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 14, text: 'Trouble experiencing positive feelings', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 15, text: 'Irritable behavior, angry outbursts, or acting aggressively', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 16, text: 'Taking too many risks or doing things that could cause you harm', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 17, text: 'Being "superalert" or watchful or on guard', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 18, text: 'Feeling jumpy or easily startled', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 19, text: 'Having difficulty concentrating', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
      { order: 20, text: 'Trouble falling or staying asleep', type: 'MULTIPLE_CHOICE', options: [{ label: 'Not at all', value: 0, order: 0 }, { label: 'A little bit', value: 1, order: 1 }, { label: 'Moderately', value: 2, order: 2 }, { label: 'Quite a bit', value: 3, order: 3 }, { label: 'Extremely', value: 4, order: 4 }] },
    ],
    thresholds: [
      { label: 'Minimal', minScore: 0, maxScore: 20 },
      { label: 'Mild', minScore: 21, maxScore: 32 },
      { label: 'Moderate', minScore: 33, maxScore: 44 },
      { label: 'Severe', minScore: 45, maxScore: 80 },
    ],
  },
]
```

- [ ] **Step 2: Create prisma/seed.ts**

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { LIBRARY_SCALES } from '../lib/seed-scales'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding library scales...')

  for (const scaleDef of LIBRARY_SCALES) {
    const existing = await prisma.scale.findFirst({
      where: { name: scaleDef.name, isLibrary: true },
    })
    if (existing) {
      console.log(`  Skipping ${scaleDef.name} (already exists)`)
      continue
    }

    await prisma.scale.create({
      data: {
        name: scaleDef.name,
        description: scaleDef.description,
        isLibrary: true,
        psychologistId: null,
        items: {
          create: scaleDef.items.map(item => ({
            order: item.order,
            text: item.text,
            type: item.type as any,
            required: true,
            options: {
              create: item.options.map(opt => ({
                label: opt.label,
                value: opt.value,
                order: opt.order,
              })),
            },
          })),
        },
        thresholds: {
          create: scaleDef.thresholds,
        },
      },
    })
    console.log(`  Seeded ${scaleDef.name}`)
  }

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Add seed config to package.json**

In `package.json`, add inside the top-level object:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Also add `ts-node` if not present:
```bash
yarn add -D ts-node
```

- [ ] **Step 4: Run seed**

```bash
yarn prisma db seed
```
Expected: `Seeded PHQ-9`, `Seeded GAD-7`, `Seeded BDI-II`, `Seeded AUDIT`, `Seeded DASS-21`, `Seeded PCL-5`, `Done.`

- [ ] **Step 5: Commit**

```bash
git add lib/seed-scales.ts prisma/seed.ts package.json yarn.lock
git commit -m "feat: seed 6 library scales (PHQ-9, GAD-7, BDI-II, AUDIT, DASS-21, PCL-5)"
```

---

## Task 4: Scale API routes (list + create + detail)

**Files:**
- Create: `app/api/scales/route.ts`
- Create: `app/api/scales/[id]/route.ts`

- [ ] **Step 1: Create app/api/scales/route.ts**

```ts
// app/api/scales/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scales = await prisma.scale.findMany({
    where: {
      OR: [
        { isLibrary: true },
        { psychologistId: session.user.id },
      ],
    },
    include: {
      _count: { select: { items: true, assessmentSessions: true } },
    },
    orderBy: [{ isLibrary: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(scales)
}

const CreateScaleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateScaleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const scale = await prisma.scale.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      psychologistId: session.user.id,
      isLibrary: false,
    },
  })

  return NextResponse.json(scale, { status: 201 })
}
```

- [ ] **Step 2: Create app/api/scales/[id]/route.ts**

```ts
// app/api/scales/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await prisma.scale.findFirst({
    where: {
      id: params.id,
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      thresholds: { orderBy: { minScore: 'asc' } },
    },
  })

  if (!scale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(scale)
}

const UpdateScaleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await prisma.scale.findFirst({
    where: { id: params.id, psychologistId: session.user.id, isLibrary: false },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateScaleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.scale.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await prisma.scale.findFirst({
    where: { id: params.id, psychologistId: session.user.id, isLibrary: false },
    include: { _count: { select: { assessmentSessions: true } } },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })
  if (scale._count.assessmentSessions > 0) {
    return NextResponse.json({ error: 'Cannot delete a scale with existing sessions' }, { status: 409 })
  }

  await prisma.scale.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/scales/
git commit -m "feat: add scales list, create, detail, update, delete API"
```

---

## Task 5: Scale items + thresholds API

**Files:**
- Create: `app/api/scales/[id]/items/route.ts`
- Create: `app/api/scales/[id]/items/[itemId]/route.ts`
- Create: `app/api/scales/[id]/thresholds/route.ts`
- Create: `app/api/scales/[id]/thresholds/[thresholdId]/route.ts`

- [ ] **Step 1: Create items routes**

```ts
// app/api/scales/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const OptionSchema = z.object({
  label: z.string().min(1),
  value: z.number().nullable().optional(),
  order: z.number(),
})

const AddItemSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'YES_NO', 'FREE_TEXT', 'NUMBER']),
  order: z.number(),
  required: z.boolean().default(true),
  options: z.array(OptionSchema).optional(),
})

async function assertOwner(scaleId: string, userId: string) {
  return prisma.scale.findFirst({
    where: { id: scaleId, psychologistId: userId, isLibrary: false },
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await assertOwner(params.id, session.user.id)
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = AddItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { options, ...itemData } = parsed.data

  const item = await prisma.scaleItem.create({
    data: {
      ...itemData,
      scaleId: params.id,
      options: options?.length
        ? { create: options }
        : undefined,
    },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json(item, { status: 201 })
}
```

```ts
// app/api/scales/[id]/items/[itemId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const UpdateItemSchema = z.object({
  text: z.string().min(1).optional(),
  order: z.number().optional(),
  required: z.boolean().optional(),
})

async function assertOwner(scaleId: string, itemId: string, userId: string) {
  return prisma.scaleItem.findFirst({
    where: {
      id: itemId,
      scaleId,
      scale: { psychologistId: userId, isLibrary: false },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await assertOwner(params.id, params.itemId, session.user.id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.scaleItem.update({
    where: { id: params.itemId },
    data: parsed.data,
    include: { options: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await assertOwner(params.id, params.itemId, session.user.id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.scaleItem.delete({ where: { id: params.itemId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create thresholds routes**

```ts
// app/api/scales/[id]/thresholds/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const AddThresholdSchema = z.object({
  label: z.string().min(1),
  minScore: z.number(),
  maxScore: z.number(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await prisma.scale.findFirst({
    where: { id: params.id, psychologistId: session.user.id, isLibrary: false },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = AddThresholdSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const threshold = await prisma.severityThreshold.create({
    data: { ...parsed.data, scaleId: params.id },
  })
  return NextResponse.json(threshold, { status: 201 })
}
```

```ts
// app/api/scales/[id]/thresholds/[thresholdId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const UpdateThresholdSchema = z.object({
  label: z.string().min(1).optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
})

async function assertOwner(scaleId: string, thresholdId: string, userId: string) {
  return prisma.severityThreshold.findFirst({
    where: {
      id: thresholdId,
      scaleId,
      scale: { psychologistId: userId, isLibrary: false },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; thresholdId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threshold = await assertOwner(params.id, params.thresholdId, session.user.id)
  if (!threshold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateThresholdSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.severityThreshold.update({
    where: { id: params.thresholdId },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; thresholdId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threshold = await assertOwner(params.id, params.thresholdId, session.user.id)
  if (!threshold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.severityThreshold.delete({ where: { id: params.thresholdId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/scales/
git commit -m "feat: add scale items and thresholds CRUD API"
```

---

## Task 6: Update session creation + fill token APIs

**Files:**
- Modify: `app/api/patients/[id]/sessions/route.ts`
- Modify: `app/api/fill/[token]/route.ts`

- [ ] **Step 1: Update session creation — replace enum with scaleId**

In `app/api/patients/[id]/sessions/route.ts`, replace:

```ts
const CreateSessionSchema = z.object({
  scale: z.enum(['PHQ9', 'BDI2', 'GAD7']),
})
```

with:

```ts
const CreateSessionSchema = z.object({
  scaleId: z.string().min(1),
})
```

Replace the create call — change `scale: parsed.data.scale` to `scaleId: parsed.data.scaleId`:

```ts
  const assessmentSession = await prisma.assessmentSession.create({
    data: {
      patientId: params.id,
      psychologistId: session.user.id,
      scaleId: parsed.data.scaleId,
      token,
      tokenExpiresAt: tokenExpiresAt(),
    },
  })
```

- [ ] **Step 2: Update fill token GET — return full scale items**

In `app/api/fill/[token]/route.ts`, replace the GET handler entirely:

```ts
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const assessmentSession = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
    include: {
      scale: {
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
          thresholds: { orderBy: { minScore: 'asc' } },
        },
      },
    },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (assessmentSession.status !== 'PENDING') return NextResponse.json({ error: 'Link already used' }, { status: 410 })
  if (isTokenExpired(assessmentSession.tokenExpiresAt)) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

  return NextResponse.json({
    scale: assessmentSession.scale,
    sessionId: assessmentSession.id,
  })
}
```

- [ ] **Step 3: Update fill token POST — dynamic scoring**

Replace the POST handler in `app/api/fill/[token]/route.ts`:

```ts
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const assessmentSession = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
    include: {
      scale: { include: { thresholds: { orderBy: { minScore: 'asc' } } } },
    },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (assessmentSession.status !== 'PENDING') return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
  if (isTokenExpired(assessmentSession.tokenExpiresAt)) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

  const body = await req.json()
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { itemScores } = parsed.data
  const totalScore = computeNumericScore(itemScores)
  const severity = lookupSeverity(totalScore, assessmentSession.scale.thresholds)

  await prisma.$transaction([
    prisma.questionnaireResponse.create({
      data: { sessionId: assessmentSession.id, itemScores, totalScore, severity },
    }),
    prisma.assessmentSession.update({
      where: { id: assessmentSession.id },
      data: { status: 'COMPLETED' },
    }),
  ])

  return NextResponse.json({ ok: true })
}
```

Also add the import at the top of the fill route:
```ts
import { computeNumericScore, lookupSeverity } from '@/lib/scale-scoring'
```

And remove the old `computeAlerts` import if present.

- [ ] **Step 4: Commit**

```bash
git add app/api/patients/\[id\]/sessions/route.ts app/api/fill/\[token\]/route.ts
git commit -m "feat: update session and fill APIs to use dynamic scale model"
```

---

## Task 7: Update Sidebar + NewSessionDialog

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Modify: `components/sessions/new-session-dialog.tsx`

- [ ] **Step 1: Add Scales to sidebar**

In `components/layout/sidebar.tsx`, add to the `NAV` array:

```ts
import { LayoutDashboard, Users, FlaskConical, LogOut } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/scales', label: 'Scales', icon: FlaskConical },
]
```

- [ ] **Step 2: Update NewSessionDialog to fetch scales dynamically**

Replace `components/sessions/new-session-dialog.tsx` entirely:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Copy, Check } from 'lucide-react'

interface Scale {
  id: string
  name: string
  isLibrary: boolean
  _count?: { items: number }
}

export function NewSessionDialog({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scales, setScales] = useState<Scale[]>([])
  const [scaleId, setScaleId] = useState('')
  const [loading, setLoading] = useState(false)
  const [fillUrl, setFillUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetch('/api/scales')
        .then(r => r.json())
        .then(setScales)
        .catch(() => setError('Failed to load scales'))
    }
  }, [open])

  async function onCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scaleId }),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to create session'); return }
    const data = await res.json()
    setFillUrl(data.fillUrl)
    router.refresh()
  }

  function onClose() {
    setOpen(false)
    setFillUrl(null)
    setScaleId('')
    setError(null)
  }

  function onCopy() {
    navigator.clipboard.writeText(fillUrl!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) onClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus size={14} className="mr-1" /> New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fillUrl ? 'Session created' : 'New Assessment Session'}</DialogTitle>
        </DialogHeader>

        {fillUrl ? (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-600">Copy and send to the patient. Expires in 72 hours, single use.</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-2">
              <span className="text-xs text-slate-600 flex-1 truncate">{fillUrl}</span>
              <button onClick={onCopy} className="text-indigo-600 hover:text-indigo-800 flex-shrink-0">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <Button onClick={onClose} variant="outline" className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Scale</Label>
              <Select value={scaleId} onValueChange={setScaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a scale…" />
                </SelectTrigger>
                <SelectContent>
                  {scales.length === 0 && (
                    <SelectItem value="_loading" disabled>Loading…</SelectItem>
                  )}
                  {scales.filter(s => s.isLibrary).length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-slate-400 font-medium uppercase tracking-wide">Library</div>
                      {scales.filter(s => s.isLibrary).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </>
                  )}
                  {scales.filter(s => !s.isLibrary).length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-slate-400 font-medium uppercase tracking-wide">Custom</div>
                      {scales.filter(s => !s.isLibrary).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={onCreate} disabled={!scaleId || loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {loading ? 'Creating…' : 'Create & get link'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx components/sessions/new-session-dialog.tsx
git commit -m "feat: add Scales nav link and dynamic scale picker in session dialog"
```

---

## Task 8: Update QuestionnaireForm

**Files:**
- Modify: `components/questionnaire/questionnaire-form.tsx`

- [ ] **Step 1: Replace with fully dynamic form**

Replace `components/questionnaire/questionnaire-form.tsx` entirely:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

interface ResponseOption {
  id: string
  label: string
  value: number | null
  order: number
}

interface ScaleItem {
  id: string
  order: number
  text: string
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'NUMBER'
  required: boolean
  options: ResponseOption[]
}

interface Scale {
  id: string
  name: string
  items: ScaleItem[]
}

interface Props {
  scale: Scale
  token: string
}

export function QuestionnaireForm({ scale, token }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allRequired = scale.items
    .filter(i => i.required)
    .every(i => answers[i.id] !== undefined && answers[i.id] !== '')

  function setAnswer(itemId: string, value: number | string) {
    setAnswers(prev => ({ ...prev, [itemId]: value }))
  }

  async function onSubmit() {
    setSubmitting(true)
    setError(null)

    const itemScores: Record<string, number | string> = {}
    scale.items.forEach(item => {
      if (answers[item.id] !== undefined) {
        itemScores[item.id] = answers[item.id]
      }
    })

    const res = await fetch(`/api/fill/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemScores }),
    })

    if (!res.ok) {
      setError('Something went wrong. Please try again or contact your clinician.')
      setSubmitting(false)
      return
    }
    router.push(`/fill/${token}/complete`)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-4">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">{scale.name}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Over the last 2 weeks, how often have you been bothered by the following?
        </p>
      </div>

      {scale.items.map((item, idx) => (
        <div key={item.id} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
          <p className="text-sm font-medium text-slate-800 leading-snug">
            {idx + 1}. {item.text}
            {item.required && <span className="text-red-400 ml-1">*</span>}
          </p>

          {item.type === 'MULTIPLE_CHOICE' && (
            <RadioGroup
              value={answers[item.id] !== undefined ? String(answers[item.id]) : ''}
              onValueChange={val => setAnswer(item.id, Number(val))}
              className="space-y-1"
            >
              {item.options.map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <RadioGroupItem value={String(opt.value)} id={`${item.id}-${opt.id}`} />
                  <Label htmlFor={`${item.id}-${opt.id}`} className="text-sm text-slate-600 cursor-pointer font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {item.type === 'YES_NO' && (
            <RadioGroup
              value={answers[item.id] !== undefined ? String(answers[item.id]) : ''}
              onValueChange={val => setAnswer(item.id, Number(val))}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="1" id={`${item.id}-yes`} />
                <Label htmlFor={`${item.id}-yes`} className="text-sm text-slate-600 cursor-pointer font-normal">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="0" id={`${item.id}-no`} />
                <Label htmlFor={`${item.id}-no`} className="text-sm text-slate-600 cursor-pointer font-normal">No</Label>
              </div>
            </RadioGroup>
          )}

          {item.type === 'FREE_TEXT' && (
            <Textarea
              value={(answers[item.id] as string) ?? ''}
              onChange={e => setAnswer(item.id, e.target.value)}
              placeholder="Type your response…"
              className="resize-none text-sm"
              rows={3}
            />
          )}

          {item.type === 'NUMBER' && (
            <Input
              type="number"
              value={(answers[item.id] as number) ?? ''}
              onChange={e => setAnswer(item.id, Number(e.target.value))}
              className="w-32 text-sm"
              placeholder="0"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        onClick={onSubmit}
        disabled={!allRequired || submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/questionnaire/questionnaire-form.tsx
git commit -m "feat: dynamic questionnaire form supporting all item types"
```

---

## Task 9: Scales list page + ScaleCard component

**Files:**
- Create: `app/(dashboard)/scales/page.tsx`
- Create: `components/scales/scale-card.tsx`

- [ ] **Step 1: Create scale-card.tsx**

```tsx
// components/scales/scale-card.tsx
import Link from 'next/link'
import { BookOpen, User, ArrowRight } from 'lucide-react'

interface Props {
  scale: {
    id: string
    name: string
    description?: string | null
    isLibrary: boolean
    _count?: { items: number }
  }
  action?: React.ReactNode
}

export function ScaleCard({ scale, action }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 p-1.5 rounded ${scale.isLibrary ? 'bg-indigo-50' : 'bg-slate-50'}`}>
          {scale.isLibrary
            ? <BookOpen size={14} className="text-indigo-600" />
            : <User size={14} className="text-slate-500" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900 truncate">{scale.name}</p>
            {scale.isLibrary && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Library</span>
            )}
          </div>
          {scale.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{scale.description}</p>
          )}
          {scale._count && (
            <p className="text-xs text-slate-400 mt-0.5">{scale._count.items} items</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        {action}
        <Link href={`/scales/${scale.id}`} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors">
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create scales list page**

```tsx
// app/(dashboard)/scales/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ScaleCard } from '@/components/scales/scale-card'
import { Plus } from 'lucide-react'

export default async function ScalesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const scales = await prisma.scale.findMany({
    where: {
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    include: { _count: { select: { items: true } } },
    orderBy: [{ isLibrary: 'desc' }, { createdAt: 'asc' }],
  })

  const library = scales.filter(s => s.isLibrary)
  const custom = scales.filter(s => !s.isLibrary)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scales</h1>
          <p className="text-slate-500 text-sm mt-0.5">{library.length} library · {custom.length} custom</p>
        </div>
        <Link
          href="/scales/new"
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-md transition-colors"
        >
          <Plus size={14} /> New Scale
        </Link>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Library Scales</h2>
        <div className="space-y-2">
          {library.map(s => (
            <ScaleCard key={s.id} scale={s} />
          ))}
        </div>
      </div>

      {custom.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">My Custom Scales</h2>
          <div className="space-y-2">
            {custom.map(s => (
              <ScaleCard key={s.id} scale={s} />
            ))}
          </div>
        </div>
      )}

      {custom.length === 0 && (
        <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center">
          <p className="text-sm text-slate-400">No custom scales yet.</p>
          <Link href="/scales/new" className="text-sm text-indigo-600 hover:underline mt-1 inline-block">
            Create your first scale →
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/scales/page.tsx components/scales/scale-card.tsx
git commit -m "feat: add scales list page with library and custom sections"
```

---

## Task 10: Scale builder (new scale page)

**Files:**
- Create: `app/(dashboard)/scales/new/page.tsx`
- Create: `components/scales/item-editor.tsx`
- Create: `components/scales/threshold-editor.tsx`

- [ ] **Step 1: Create item-editor.tsx**

```tsx
// components/scales/item-editor.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, GripVertical } from 'lucide-react'

export interface ItemDraft {
  tempId: string
  text: string
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'NUMBER'
  order: number
  options: { tempId: string; label: string; value: number | null; order: number }[]
}

interface Props {
  item: ItemDraft
  onChange: (updated: ItemDraft) => void
  onRemove: () => void
}

export function ItemEditor({ item, onChange, onRemove }: Props) {
  function updateField<K extends keyof ItemDraft>(key: K, val: ItemDraft[K]) {
    onChange({ ...item, [key]: val })
  }

  function addOption() {
    onChange({
      ...item,
      options: [
        ...item.options,
        { tempId: crypto.randomUUID(), label: '', value: item.options.length, order: item.options.length },
      ],
    })
  }

  function updateOption(tempId: string, field: 'label' | 'value', val: string | number) {
    onChange({
      ...item,
      options: item.options.map(o =>
        o.tempId === tempId ? { ...o, [field]: field === 'value' ? Number(val) : val } : o
      ),
    })
  }

  function removeOption(tempId: string) {
    onChange({ ...item, options: item.options.filter(o => o.tempId !== tempId) })
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-slate-300 mt-2.5 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <Input
              value={item.text}
              onChange={e => updateField('text', e.target.value)}
              placeholder="Question text…"
              className="flex-1 text-sm"
            />
            <Select value={item.type} onValueChange={val => updateField('type', val as ItemDraft['type'])}>
              <SelectTrigger className="w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                <SelectItem value="YES_NO">Yes / No</SelectItem>
                <SelectItem value="FREE_TEXT">Free Text</SelectItem>
                <SelectItem value="NUMBER">Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {item.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              {item.options.map(opt => (
                <div key={opt.tempId} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={e => updateOption(opt.tempId, 'label', e.target.value)}
                    placeholder="Option label"
                    className="flex-1 text-sm h-8"
                  />
                  <Input
                    type="number"
                    value={opt.value ?? ''}
                    onChange={e => updateOption(opt.tempId, 'value', e.target.value)}
                    placeholder="Points"
                    className="w-20 text-sm h-8"
                  />
                  <button onClick={() => removeOption(opt.tempId)} className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                <Plus size={12} /> Add option
              </button>
            </div>
          )}

          {item.type === 'YES_NO' && (
            <p className="text-xs text-slate-400">Yes = 1, No = 0 (auto-scored)</p>
          )}
          {item.type === 'FREE_TEXT' && (
            <p className="text-xs text-slate-400">Free text — not included in score</p>
          )}
          {item.type === 'NUMBER' && (
            <p className="text-xs text-slate-400">Numeric input — value used directly in score</p>
          )}
        </div>
        <button onClick={onRemove} className="text-slate-300 hover:text-red-400 mt-1 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create threshold-editor.tsx**

```tsx
// components/scales/threshold-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

export interface ThresholdDraft {
  tempId: string
  label: string
  minScore: number
  maxScore: number
}

interface Props {
  threshold: ThresholdDraft
  onChange: (updated: ThresholdDraft) => void
  onRemove: () => void
}

export function ThresholdEditor({ threshold, onChange, onRemove }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={threshold.label}
        onChange={e => onChange({ ...threshold, label: e.target.value })}
        placeholder="Label (e.g. Mild)"
        className="flex-1 text-sm h-8"
      />
      <Input
        type="number"
        value={threshold.minScore}
        onChange={e => onChange({ ...threshold, minScore: Number(e.target.value) })}
        placeholder="Min"
        className="w-20 text-sm h-8"
      />
      <span className="text-slate-400 text-sm">–</span>
      <Input
        type="number"
        value={threshold.maxScore}
        onChange={e => onChange({ ...threshold, maxScore: Number(e.target.value) })}
        placeholder="Max"
        className="w-20 text-sm h-8"
      />
      <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create scales/new/page.tsx**

```tsx
// app/(dashboard)/scales/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ItemEditor, type ItemDraft } from '@/components/scales/item-editor'
import { ThresholdEditor, type ThresholdDraft } from '@/components/scales/threshold-editor'
import { Plus, ChevronRight } from 'lucide-react'

type Step = 1 | 2 | 3

export default function NewScalePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([])
  const [thresholds, setThresholds] = useState<ThresholdDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addItem() {
    setItems(prev => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        text: '',
        type: 'MULTIPLE_CHOICE',
        order: prev.length + 1,
        options: [],
      },
    ])
  }

  function updateItem(tempId: string, updated: ItemDraft) {
    setItems(prev => prev.map(i => i.tempId === tempId ? updated : i))
  }

  function removeItem(tempId: string) {
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  function addThreshold() {
    setThresholds(prev => [
      ...prev,
      { tempId: crypto.randomUUID(), label: '', minScore: 0, maxScore: 10 },
    ])
  }

  function updateThreshold(tempId: string, updated: ThresholdDraft) {
    setThresholds(prev => prev.map(t => t.tempId === tempId ? updated : t))
  }

  function removeThreshold(tempId: string) {
    setThresholds(prev => prev.filter(t => t.tempId !== tempId))
  }

  async function onSave() {
    setSaving(true)
    setError(null)

    // Step 1: Create scale
    const scaleRes = await fetch('/api/scales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    if (!scaleRes.ok) { setError('Failed to create scale'); setSaving(false); return }
    const scale = await scaleRes.json()

    // Step 2: Add items
    for (const item of items) {
      if (!item.text.trim()) continue
      await fetch(`/api/scales/${scale.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          type: item.type,
          order: item.order,
          required: true,
          options: item.type === 'MULTIPLE_CHOICE'
            ? item.options.map(o => ({ label: o.label, value: o.value, order: o.order }))
            : item.type === 'YES_NO'
            ? [{ label: 'Yes', value: 1, order: 0 }, { label: 'No', value: 0, order: 1 }]
            : [],
        }),
      })
    }

    // Step 3: Add thresholds
    for (const t of thresholds) {
      if (!t.label.trim()) continue
      await fetch(`/api/scales/${scale.id}/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: t.label, minScore: t.minScore, maxScore: t.maxScore }),
      })
    }

    setSaving(false)
    router.push(`/scales/${scale.id}`)
  }

  const STEPS = ['Details', 'Questions', 'Scoring']

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New Scale</h1>
        <div className="flex items-center gap-1 mt-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => step > i + 1 && setStep((i + 1) as Step)}
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  step === i + 1
                    ? 'bg-indigo-600 text-white'
                    : step > i + 1
                    ? 'text-indigo-600 hover:underline cursor-pointer'
                    : 'text-slate-400'
                }`}
              >
                {i + 1}. {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Scale name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Mood Check" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="desc">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this scale" />
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Next: Add Questions
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">{items.length} question{items.length !== 1 ? 's' : ''}</p>
            <button onClick={addItem} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
              <Plus size={14} /> Add question
            </button>
          </div>

          {items.length === 0 && (
            <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-400 mb-2">No questions yet.</p>
              <button onClick={addItem} className="text-sm text-indigo-600 hover:underline">Add first question →</button>
            </div>
          )}

          {items.map(item => (
            <ItemEditor
              key={item.tempId}
              item={item}
              onChange={updated => updateItem(item.tempId, updated)}
              onRemove={() => removeItem(item.tempId)}
            />
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700">
              Next: Scoring
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Severity thresholds <span className="text-slate-400 font-normal">(optional)</span></Label>
              <button onClick={addThreshold} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                <Plus size={14} /> Add threshold
              </button>
            </div>
            <p className="text-xs text-slate-400">Define score ranges and their clinical labels, e.g. "Mild: 0–9"</p>
          </div>

          {thresholds.length === 0 && (
            <p className="text-sm text-slate-400">No thresholds — responses will be stored as raw scores only.</p>
          )}

          <div className="space-y-2">
            {thresholds.map(t => (
              <ThresholdEditor
                key={t.tempId}
                threshold={t}
                onChange={updated => updateThreshold(t.tempId, updated)}
                onRemove={() => removeThreshold(t.tempId)}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={onSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Creating…' : 'Create Scale'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/scales/new/ components/scales/
git commit -m "feat: add scale builder with item editor and threshold editor"
```

---

## Task 11: Scale detail page

**Files:**
- Create: `app/(dashboard)/scales/[id]/page.tsx`

- [ ] **Step 1: Create scale detail page**

```tsx
// app/(dashboard)/scales/[id]/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { BookOpen, User, Lock } from 'lucide-react'

export default async function ScaleDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const scale = await prisma.scale.findFirst({
    where: {
      id: params.id,
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      thresholds: { orderBy: { minScore: 'asc' } },
      _count: { select: { assessmentSessions: true } },
    },
  })

  if (!scale) notFound()

  const isOwned = !scale.isLibrary && scale.psychologistId === session.user.id

  const TYPE_LABELS: Record<string, string> = {
    MULTIPLE_CHOICE: 'Multiple Choice',
    YES_NO: 'Yes / No',
    FREE_TEXT: 'Free Text',
    NUMBER: 'Number',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {scale.isLibrary
              ? <BookOpen size={16} className="text-indigo-600" />
              : <User size={16} className="text-slate-500" />
            }
            <h1 className="text-xl font-semibold text-slate-900">{scale.name}</h1>
            {scale.isLibrary && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                <Lock size={10} /> Library · Read-only
              </span>
            )}
          </div>
          {scale.description && <p className="text-sm text-slate-500">{scale.description}</p>}
          <p className="text-xs text-slate-400 mt-1">{scale.items.length} items · {scale._count.assessmentSessions} sessions used</p>
        </div>
        {isOwned && (
          <Link href={`/scales/${scale.id}/edit`} className="text-sm text-indigo-600 hover:underline">
            Edit →
          </Link>
        )}
      </div>

      {/* Items */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Questions</h2>
        <div className="space-y-2">
          {scale.items.map((item, i) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-800">
                  <span className="text-slate-400 mr-2">{i + 1}.</span>{item.text}
                </p>
                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0">
                  {TYPE_LABELS[item.type]}
                </span>
              </div>
              {item.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.options.map(opt => (
                    <span key={opt.id} className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      {opt.label}{opt.value !== null ? ` (${opt.value})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Thresholds */}
      {scale.thresholds.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Severity Thresholds</h2>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Label</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scale.thresholds.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 text-slate-700 font-medium">{t.label}</td>
                    <td className="px-4 py-2 text-slate-500">{t.minScore}–{t.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/scales/\[id\]/
git commit -m "feat: add scale detail page"
```

---

## Task 12: Run tests + build check

**Files:** None

- [ ] **Step 1: Run test suite**

```bash
yarn test
```
Expected: All tests pass (includes new scale-scoring tests)

- [ ] **Step 2: Run linter**

```bash
yarn lint 2>&1 | grep -v Warning
```
Expected: No errors.

- [ ] **Step 3: Run build**

```bash
yarn build
```
Expected: Build completes successfully.

- [ ] **Step 4: Verify seed ran and scales appear**

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.scale.findMany({ where: { isLibrary: true }, select: { name: true } })
  .then(scales => { console.log(scales.map(s => s.name).join(', ')); })
  .finally(() => prisma.\$disconnect());
"
```
Expected: `PHQ-9, GAD-7, BDI-II, AUDIT, DASS-21, PCL-5`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: scale questionnaire builder — all tests passing, build clean"
```
