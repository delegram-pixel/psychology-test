import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Plus, Lock } from 'lucide-react'

export default async function ScalesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const [libraryScales, myScales] = await Promise.all([
    prisma.scale.findMany({
      where: { isLibrary: true },
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.scale.findMany({
      where: { psychologistId: session.user.id, isLibrary: false },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scales</h1>
          <p className="text-slate-500 text-sm mt-1">Validated library instruments and your custom questionnaires</p>
        </div>
        <Link
          href="/scales/new"
          className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus size={14} /> New Scale
        </Link>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Library Scales</h2>
          <span className="text-xs text-slate-400">Read-only validated instruments</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {libraryScales.map(scale => (
            <div key={scale.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{scale.name}</p>
                  {scale.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{scale.description}</p>
                  )}
                </div>
                <Lock size={12} className="text-slate-300 mt-0.5 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-400">{scale._count.items} items</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">My Scales</h2>
        {myScales.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-sm">
            No custom scales yet.{' '}
            <Link href="/scales/new" className="text-indigo-600 hover:underline">
              Create your first scale
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myScales.map(scale => (
              <Link
                key={scale.id}
                href={`/scales/${scale.id}`}
                className="block bg-white border border-slate-200 rounded-lg p-4 space-y-2 hover:border-indigo-300 transition-colors"
              >
                <p className="font-medium text-slate-800 text-sm">{scale.name}</p>
                {scale.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{scale.description}</p>
                )}
                <p className="text-xs text-slate-400">{scale._count.items} items</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
