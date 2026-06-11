'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const url = `${window.location.origin}/fill/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs"
    >
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
    </button>
  )
}
