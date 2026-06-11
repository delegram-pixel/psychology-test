'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

// ── Hardcoded items for the 3 standard library scales ────────────────────────

const SCALE_OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
]

const PHQ9_ITEMS = [
  { number: 1, text: 'Little interest or pleasure in doing things', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 2, text: 'Feeling down, depressed, or hopeless', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 3, text: 'Trouble falling or staying asleep, or sleeping too much', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 4, text: 'Feeling tired or having little energy', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 5, text: 'Poor appetite or overeating', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 6, text: 'Feeling bad about yourself — or that you are a failure', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 7, text: 'Trouble concentrating on things', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 8, text: 'Moving or speaking so slowly that other people could have noticed', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
]

const GAD7_ITEMS = [
  { number: 1, text: 'Feeling nervous, anxious, or on edge', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 2, text: 'Not being able to stop or control worrying', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 3, text: 'Worrying too much about different things', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 4, text: 'Trouble relaxing', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 5, text: 'Being so restless that it is hard to sit still', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 6, text: 'Becoming easily annoyed or irritable', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
  { number: 7, text: 'Feeling afraid as if something awful might happen', type: 'MULTIPLE_CHOICE', options: SCALE_OPTIONS },
]

const BDI2_OPTIONS = [
  { label: '0 — No sadness', value: 0 },
  { label: '1 — I feel sad much of the time', value: 1 },
  { label: '2 — I am sad all the time', value: 2 },
  { label: '3 — I am so sad or unhappy that I cannot stand it', value: 3 },
]

const BDI2_ITEMS = Array.from({ length: 21 }, (_, i) => ({
  number: i + 1,
  text: `BDI-II Item ${i + 1}`,
  type: 'MULTIPLE_CHOICE',
  options: BDI2_OPTIONS,
}))

const HARDCODED_ITEMS: Record<string, typeof PHQ9_ITEMS> = {
  PHQ9: PHQ9_ITEMS,
  GAD7: GAD7_ITEMS,
  BDI2: BDI2_ITEMS,
}

const SCALE_LABELS: Record<string, string> = {
  PHQ9: 'Patient Health Questionnaire (PHQ-9)',
  GAD7: 'Generalised Anxiety Disorder Assessment (GAD-7)',
  BDI2: 'Beck Depression Inventory (BDI-II)',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface DbItem {
  order: number
  text: string
  type: string
  options: { label: string; value: number | null }[]
}

interface NormalisedItem {
  number: number
  text: string
  type: string
  options: { label: string; value: number }[]
}

interface Props {
  scale: string
  scaleName: string
  token: string
  dbItems?: DbItem[]
}

// ── Component ────────────────────────────────────────────────────────────────

export function QuestionnaireForm({ scale, scaleName, token, dbItems }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<number, number | string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items: NormalisedItem[] = (dbItems && dbItems.length > 0)
    ? dbItems.map(item => ({
        number: item.order,
        text: item.text,
        type: item.type,
        options: item.type === 'YES_NO'
          ? [{ label: 'Yes', value: 1 }, { label: 'No', value: 0 }]
          : item.options.map(o => ({ label: o.label, value: o.value ?? 0 })),
      }))
    : (HARDCODED_ITEMS[scale] ?? [])

  const allAnswered = items.every(item => answers[item.number] !== undefined && answers[item.number] !== '')

  async function onSubmit() {
    setSubmitting(true)
    setError(null)
    const itemScores: Record<string, number> = {}
    items.forEach(item => {
      const val = answers[item.number]
      if (item.type === 'FREE_TEXT') {
        itemScores[String(item.number)] = 0
      } else {
        itemScores[String(item.number)] = Number(val)
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

  const title = SCALE_LABELS[scale] ?? scaleName

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Over the last 2 weeks, how often have you been bothered by the following?
        </p>
      </div>

      {items.length === 0 && (
        <p className="text-slate-400 text-sm">This scale has no questions configured yet.</p>
      )}

      {items.map(item => (
        <div key={item.number} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
          <p className="text-sm font-medium text-slate-800">
            {item.number}. {item.text}
          </p>

          {(item.type === 'MULTIPLE_CHOICE' || item.type === 'YES_NO') && (
            <RadioGroup
              value={answers[item.number] !== undefined ? String(answers[item.number]) : ''}
              onValueChange={val => setAnswers(prev => ({ ...prev, [item.number]: Number(val) }))}
              className="space-y-1"
            >
              {item.options.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={String(opt.value)} id={`item-${item.number}-${opt.value}`} />
                  <Label htmlFor={`item-${item.number}-${opt.value}`} className="text-sm text-slate-600 cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {item.type === 'NUMBER' && (
            <Input
              type="number"
              className="w-32"
              value={answers[item.number] ?? ''}
              onChange={e => setAnswers(prev => ({ ...prev, [item.number]: e.target.value }))}
            />
          )}

          {item.type === 'FREE_TEXT' && (
            <textarea
              className="w-full border border-slate-200 rounded-md p-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={String(answers[item.number] ?? '')}
              onChange={e => setAnswers(prev => ({ ...prev, [item.number]: e.target.value }))}
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {items.length > 0 && (
        <Button
          onClick={onSubmit}
          disabled={!allAnswered || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      )}
    </div>
  )
}
