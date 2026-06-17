import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ArrowLeft, Lock } from 'lucide-react'
import { DeleteScaleButton } from './_delete-button'

export default async function ScaleDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const scale = await prisma.scale.findFirst({
    where: {
      id: params.id,
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      thresholds: { orderBy: { minScore: 'asc' } },
      _count: { select: { assessmentSessions: true } },
    },
  })

  if (!scale) notFound()

  const canDelete = !scale.isLibrary && scale._count.assessmentSessions === 0

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/scales" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{scale.name}</h1>
              {scale.isLibrary && (
                <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <Lock size={11} /> Library
                </span>
              )}
            </div>
            {scale.description && (
              <p className="text-slate-500 text-sm mt-0.5">{scale.description}</p>
            )}
          </div>
        </div>
        {canDelete && <DeleteScaleButton scaleId={scale.id} />}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Items</h2>
          <span className="text-xs text-slate-400">{scale.items.length} question{scale.items.length !== 1 ? 's' : ''}</span>
        </div>
        {scale.items.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">No items configured yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {scale.items.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-start gap-3">
                <span className="text-xs text-slate-400 mt-0.5 w-5 flex-shrink-0">{item.order}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{item.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {item.type.replace('_', ' ').toLowerCase()}
                    {!item.required && ' · optional'}
                  </p>
                  {item.options.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.options.map(o => (
                        <span
                          key={o.id}
                          className="text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600"
                        >
                          {o.label}{o.value !== null ? ` (${o.value})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {scale.thresholds.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Score Interpretation</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Label', 'Min score', 'Max score'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scale.thresholds.map(t => (
                <tr key={t.id}>
                  <td className="px-5 py-3 text-slate-800 font-medium">{t.label}</td>
                  <td className="px-5 py-3 text-slate-500">{t.minScore}</td>
                  <td className="px-5 py-3 text-slate-500">{t.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Used in {scale._count.assessmentSessions} assessment session{scale._count.assessmentSessions !== 1 ? 's' : ''}.
        {!canDelete && !scale.isLibrary && scale._count.assessmentSessions > 0 &&
          ' Scale cannot be deleted while sessions reference it.'}
      </p>
    </div>
  )
}
