'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Item {
  number: number
  text: string
  options: { label: string; value: number }[]
}

const SCALE_OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
]

const PHQ9_ITEMS: Item[] = [
  { number: 1, text: 'Little interest or pleasure in doing things', options: SCALE_OPTIONS },
  { number: 2, text: 'Feeling down, depressed, or hopeless', options: SCALE_OPTIONS },
  { number: 3, text: 'Trouble falling or staying asleep, or sleeping too much', options: SCALE_OPTIONS },
  { number: 4, text: 'Feeling tired or having little energy', options: SCALE_OPTIONS },
  { number: 5, text: 'Poor appetite or overeating', options: SCALE_OPTIONS },
  { number: 6, text: 'Feeling bad about yourself — or that you are a failure', options: SCALE_OPTIONS },
  { number: 7, text: 'Trouble concentrating on things', options: SCALE_OPTIONS },
  { number: 8, text: 'Moving or speaking so slowly that other people could have noticed', options: SCALE_OPTIONS },
  { number: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself', options: SCALE_OPTIONS },
]

const GAD7_ITEMS: Item[] = [
  { number: 1, text: 'Feeling nervous, anxious, or on edge', options: SCALE_OPTIONS },
  { number: 2, text: 'Not being able to stop or control worrying', options: SCALE_OPTIONS },
  { number: 3, text: 'Worrying too much about different things', options: SCALE_OPTIONS },
  { number: 4, text: 'Trouble relaxing', options: SCALE_OPTIONS },
  { number: 5, text: 'Being so restless that it is hard to sit still', options: SCALE_OPTIONS },
  { number: 6, text: 'Becoming easily annoyed or irritable', options: SCALE_OPTIONS },
  { number: 7, text: 'Feeling afraid as if something awful might happen', options: SCALE_OPTIONS },
]

const BDI2_OPTIONS = [
  { label: '0 — No sadness', value: 0 },
  { label: '1 — I feel sad much of the time', value: 1 },
  { label: '2 — I am sad all the time', value: 2 },
  { label: '3 — I am so sad or unhappy that I cannot stand it', value: 3 },
]

const BDI2_ITEMS: Item[] = Array.from({ length: 21 }, (_, i) => ({
  number: i + 1,
  text: `BDI-II Item ${i + 1}`,
  options: BDI2_OPTIONS,
}))

const SCALE_ITEMS: Record<string, Item[]> = {
  PHQ9: PHQ9_ITEMS,
  GAD7: GAD7_ITEMS,
  BDI2: BDI2_ITEMS,
}

const SCALE_LABELS: Record<string, string> = {
  PHQ9: 'Patient Health Questionnaire (PHQ-9)',
  GAD7: 'Generalised Anxiety Disorder Assessment (GAD-7)',
  BDI2: 'Beck Depression Inventory (BDI-II)',
}

interface Props {
  scale: string
  token: string
}

export function QuestionnaireForm({ scale, token }: Props) {
  const router = useRouter()
  const items = SCALE_ITEMS[scale] ?? []
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAnswered = items.every(item => answers[item.number] !== undefined)

  async function onSubmit() {
    setSubmitting(true)
    setError(null)
    const itemScores: Record<string, number> = {}
    items.forEach(item => { itemScores[String(item.number)] = answers[item.number] })

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
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{SCALE_LABELS[scale]}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Over the last 2 weeks, how often have you been bothered by the following?
        </p>
      </div>

      {items.map(item => (
        <div key={item.number} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
          <p className="text-sm font-medium text-slate-800">
            {item.number}. {item.text}
          </p>
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
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        onClick={onSubmit}
        disabled={!allAnswered || submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </Button>
    </div>
  )
}
