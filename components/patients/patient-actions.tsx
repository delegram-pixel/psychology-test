'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  patientId: string
  currentDisplayName: string
}

export function PatientActions({ patientId, currentDisplayName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function saveEdit() {
    if (!displayName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    }
  }

  async function deletePatient() {
    if (!confirm('Delete this patient and all their sessions? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/patients/${patientId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/patients')
      router.refresh()
    } else {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="h-8 text-sm w-48"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
        />
        <Button size="sm" variant="outline" onClick={saveEdit} disabled={saving || !displayName.trim()} className="h-8 px-2">
          {saving ? '…' : <Check size={14} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDisplayName(currentDisplayName) }} className="h-8 px-2">
          <X size={14} />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setEditing(true)}
        className="h-7 px-2 text-slate-400 hover:text-slate-700"
        title="Edit display name"
      >
        <Pencil size={13} />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={deletePatient}
        disabled={deleting}
        className="h-7 px-2 text-slate-400 hover:text-red-500"
        title="Delete patient"
      >
        <Trash2 size={13} />
      </Button>
    </div>
  )
}
