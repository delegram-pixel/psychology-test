import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'

export default async function PatientsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <NewPatientDialog />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {patients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No patients yet. Click "New Patient" to add one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', 'Name', 'Sessions', 'Last Score', 'Added', ''].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map(p => {
                const completed = p.assessmentSessions.filter(s => s.response)
                const latest = completed[0]
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.anonymousId}</td>
                    <td className="px-5 py-3 text-slate-600">{p.displayName}</td>
                    <td className="px-5 py-3 text-slate-500">{completed.length}</td>
                    <td className="px-5 py-3 text-slate-800">{latest?.response?.totalScore ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <Link href={`/patients/${p.id}`} className="text-indigo-600 text-xs hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
