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
