'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteScaleButton({ scaleId }: { scaleId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onDelete() {
    if (!confirm('Delete this scale? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/scales/${scaleId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/scales')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete scale.')
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-700 hover:border-red-300"
    >
      <Trash2 size={14} className="mr-1" />
      {loading ? 'Deleting…' : 'Delete scale'}
    </Button>
  )
}
