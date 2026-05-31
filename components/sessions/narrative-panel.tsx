'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

const SCALE_NAMES: Record<string, string> = { PHQ9: 'PHQ-9', BDI2: 'BDI-II', GAD7: 'GAD-7' }

interface Props {
  clinicalPayload: {
    scale: string
    totalScore: number
    severity: string
    itemScores: Record<string, number>
    suicidalIdeation: boolean
  }
}

export function NarrativePanel({ clinicalPayload }: Props) {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [escalated, setEscalated] = useState(false)

  useEffect(() => {
    const items = Object.entries(clinicalPayload.itemScores)
      .map(([k, v]) => `Item ${k}: ${v}`)
      .join(', ')

    const prompt = `You are a clinical psychologist assistant providing a structured clinical summary for a clinician's review. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language. You have no identifying information about this person.

Scale: ${SCALE_NAMES[clinicalPayload.scale]}
Total score: ${clinicalPayload.totalScore} — Severity: ${clinicalPayload.severity}
Item scores: ${items}
${clinicalPayload.suicidalIdeation ? 'NOTE: Item 9 is endorsed above zero. This must be flagged as the first clinical priority.' : ''}

Write a clinical summary of 4–5 sentences: (1) overall severity with reference to the score, (2) most clinically significant item-level patterns, (3) any safety-relevant endorsements, (4) recommended follow-up priority (routine / priority / urgent) with brief rationale.`

    fetch('/api/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
      .then(r => r.json())
      .then(data => {
        setNarrative(data.content?.[0]?.text ?? 'Unable to generate summary.')
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to generate summary. Check your API key.')
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">AI Clinical Summary</h2>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Generating clinical summary…
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {narrative && (
        <p className="text-sm text-slate-700 leading-relaxed">{narrative}</p>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReviewed(true)}
          className={reviewed ? 'border-green-400 text-green-600' : ''}
        >
          {reviewed ? <><CheckCircle size={14} className="mr-1" /> Reviewed</> : 'Mark Reviewed'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEscalated(true)}
          className={escalated ? 'border-orange-400 text-orange-600' : ''}
        >
          {escalated ? <><AlertTriangle size={14} className="mr-1" /> Escalated</> : 'Escalate to Supervisor'}
        </Button>
      </div>
    </div>
  )
}
