import Link from 'next/link'
import { BookOpen, User, ArrowRight } from 'lucide-react'

interface Props {
  scale: {
    id: string
    name: string
    description?: string | null
    isLibrary: boolean
    _count?: { items: number }
  }
}

export function ScaleCard({ scale }: Props) {
  return (
    <Link href={`/scales/${scale.id}`} className="group block bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 p-1.5 rounded flex-shrink-0 ${scale.isLibrary ? 'bg-indigo-50' : 'bg-slate-50'}`}>
            {scale.isLibrary
              ? <BookOpen size={14} className="text-indigo-600" />
              : <User size={14} className="text-slate-500" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-900">{scale.name}</p>
              {scale.isLibrary && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Library</span>
              )}
            </div>
            {scale.description && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{scale.description}</p>
            )}
            {scale._count !== undefined && (
              <p className="text-xs text-slate-400 mt-0.5">{scale._count.items} items</p>
            )}
          </div>
        </div>
        <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 mt-1 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  )
}
