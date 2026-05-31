'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Copy, Check } from 'lucide-react'

export function NewSessionDialog({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fillUrl, setFillUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale }),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to create session'); return }
    const data = await res.json()
    setFillUrl(data.fillUrl)
    router.refresh()
  }

  function onCopy() {
    navigator.clipboard.writeText(fillUrl!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function onClose() {
    setOpen(false)
    setFillUrl(null)
    setScale('')
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
          <div className="space-y-4 mt-2">
            <p className="text-sm text-slate-600">
              Copy this link and send it to the patient. It expires in 72 hours and can only be used once.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              <span className="text-xs text-slate-600 flex-1 truncate">{fillUrl}</span>
              <button onClick={onCopy} className="text-indigo-600 hover:text-indigo-800 flex-shrink-0">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <Button onClick={onClose} variant="outline" className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Scale</Label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a scale…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHQ9">PHQ-9 (Depression)</SelectItem>
                  <SelectItem value="GAD7">GAD-7 (Anxiety)</SelectItem>
                  <SelectItem value="BDI2">BDI-II (Depression)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={onCreate}
              disabled={!scale || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Creating…' : 'Create & get link'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
