// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LayoutDashboard, Users, LogOut } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ backgroundColor: '#0F172A' }}>
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-white font-semibold text-lg tracking-tight">APAS</span>
        <p className="text-slate-400 text-xs mt-0.5">Clinical Overwatch</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-300 text-sm font-medium truncate">{session?.user?.name}</p>
        <p className="text-slate-500 text-xs mb-3 truncate">{session?.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-xs"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  )
}
