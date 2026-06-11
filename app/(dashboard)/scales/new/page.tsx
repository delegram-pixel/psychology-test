'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react'

type ItemType = 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'NUMBER'

interface Option { label: string; value: string }
interface DraftItem { text: string; type: ItemType; options: Option[] }
interface DraftThreshold { label: string; minScore: string; maxScore: string }

const STEPS = ['Basic Info', 'Questions', 'Score Thresholds']

export default function NewScalePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 0
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Step 1 — items
  const [items, setItems] = useState<DraftItem[]>([])
  const [itemText, setItemText] = useState('')
  const [itemType, setItemType] = useState<ItemType>('MULTIPLE_CHOICE')
  const [options, setOptions] = useState<Option[]>([{ label: '', value: '' }])

  // Step 2 — thresholds
  const [thresholds, setThresholds] = useState<DraftThreshold[]>([{ label: '', minScore: '', maxScore: '' }])

  function addOption() {
    setOptions(o => [...o, { label: '', value: '' }])
  }

  function removeOption(i: number) {
    setOptions(o => o.filter((_, idx) => idx !== i))
  }

  function updateOption(i: number, field: 'label' | 'value', val: string) {
    setOptions(o => o.map((opt, idx) => idx === i ? { ...opt, [field]: val } : opt))
  }

  function addItem() {
    if (!itemText.trim()) return
    const newItem: DraftItem = {
      text: itemText.trim(),
      type: itemType,
      options: (itemType === 'MULTIPLE_CHOICE') ? options.filter(o => o.label.trim()) : [],
    }
    setItems(items => [...items, newItem])
    setItemText('')
    setItemType('MULTIPLE_CHOICE')
    setOptions([{ label: '', value: '' }])
  }

  function removeItem(i: number) {
    setItems(items => items.filter((_, idx) => idx !== i))
  }

  function addThresholdRow() {
    setThresholds(t => [...t, { label: '', minScore: '', maxScore: '' }])
  }

  function removeThresholdRow(i: number) {
    setThresholds(t => t.filter((_, idx) => idx !== i))
  }

  function updateThreshold(i: number, field: keyof DraftThreshold, val: string) {
    setThresholds(t => t.map((th, idx) => idx === i ? { ...th, [field]: val } : th))
  }

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      // 1. Create scale
      const scaleRes = await fetch('/api/scales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!scaleRes.ok) throw new Error('Failed to create scale')
      const scale = await scaleRes.json()

      // 2. Add items
      for (const item of items) {
        const body: Record<string, unknown> = { text: item.text, type: item.type }
        if (item.type === 'MULTIPLE_CHOICE' && item.options.length) {
          body.options = item.options.map(o => ({
            label: o.label,
            value: o.value !== '' ? Number(o.value) : undefined,
          }))
        }
        const r = await fetch(`/api/scales/${scale.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) throw new Error('Failed to save item')
      }

      // 3. Add thresholds
      for (const th of thresholds) {
        if (!th.label.trim() || th.minScore === '' || th.maxScore === '') continue
        const r = await fetch(`/api/scales/${scale.id}/thresholds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: th.label,
            minScore: Number(th.minScore),
            maxScore: Number(th.maxScore),
          }),
        })
        if (!r.ok) throw new Error('Failed to save threshold')
      }

      router.push('/scales')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const step0Valid = name.trim().length > 0
  const step1Valid = items.length > 0

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New Scale</h1>
        <p className="text-slate-500 text-sm mt-1">Build a custom questionnaire</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              i < step ? 'bg-indigo-600 text-white' :
              i === step ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600' :
              'bg-slate-100 text-slate-400'
            }`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === step ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 0 — Basic info */}
      {step === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="space-y-1">
            <Label>Scale name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Mood Check" />
          </div>
          <div className="space-y-1">
            <Label>Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this scale" />
          </div>
        </div>
      )}

      {/* Step 1 — Items */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Existing items */}
          {items.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs text-slate-400 mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">{item.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.type.replace('_', ' ').toLowerCase()}{item.options.length ? ` · ${item.options.length} options` : ''}</p>
                  </div>
                  <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add item form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Add question</p>
            <div className="space-y-1">
              <Label>Question text</Label>
              <Input value={itemText} onChange={e => setItemText(e.target.value)} placeholder="e.g. How often have you felt anxious?" />
            </div>
            <div className="space-y-1">
              <Label>Response type</Label>
              <Select value={itemType} onValueChange={v => setItemType(v as ItemType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                  <SelectItem value="YES_NO">Yes / No</SelectItem>
                  <SelectItem value="FREE_TEXT">Free Text</SelectItem>
                  <SelectItem value="NUMBER">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                <Label>Answer options</Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder={`Option ${i + 1} label`}
                      value={opt.label}
                      onChange={e => updateOption(i, 'label', e.target.value)}
                    />
                    <Input
                      className="w-20"
                      placeholder="Value"
                      type="number"
                      value={opt.value}
                      onChange={e => updateOption(i, 'value', e.target.value)}
                    />
                    {options.length > 1 && (
                      <button onClick={() => removeOption(i)} className="text-slate-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addOption} className="text-xs text-indigo-600 hover:underline">+ Add option</button>
              </div>
            )}

            <Button
              onClick={addItem}
              disabled={!itemText.trim()}
              size="sm"
              variant="outline"
              className="gap-1"
            >
              <Plus size={14} /> Add question
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Thresholds */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Score thresholds <span className="text-slate-400 font-normal text-xs">(optional)</span></p>
            <p className="text-xs text-slate-500 mt-0.5">Define severity labels for score ranges</p>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 font-medium px-1">
              <span>Label</span><span>Min score</span><span>Max score</span>
            </div>
            {thresholds.map((th, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <Input placeholder="e.g. Mild" value={th.label} onChange={e => updateThreshold(i, 'label', e.target.value)} />
                  <Input placeholder="0" type="number" value={th.minScore} onChange={e => updateThreshold(i, 'minScore', e.target.value)} />
                  <Input placeholder="10" type="number" value={th.maxScore} onChange={e => updateThreshold(i, 'maxScore', e.target.value)} />
                </div>
                {thresholds.length > 1 && (
                  <button onClick={() => removeThresholdRow(i)} className="text-slate-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addThresholdRow} className="text-xs text-indigo-600 hover:underline">+ Add threshold</button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => step === 0 ? router.push('/scales') : setStep(s => s - 1)}
          className="gap-1"
        >
          <ChevronLeft size={14} /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !step0Valid : step === 1 ? !step1Valid : false}
            className="gap-1 bg-indigo-600 hover:bg-indigo-700"
          >
            Next <ChevronRight size={14} />
          </Button>
        ) : (
          <Button
            onClick={finish}
            disabled={saving}
            className="gap-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? 'Saving…' : <><Check size={14} /> Create scale</>}
          </Button>
        )}
      </div>
    </div>
  )
}
