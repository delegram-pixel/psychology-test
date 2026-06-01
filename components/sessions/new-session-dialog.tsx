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
