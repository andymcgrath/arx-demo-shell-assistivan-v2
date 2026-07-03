import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const PORTAL_TABS = [
  { label: 'Patient',    path: '/patient' },
  { label: 'Provider',   path: '/provider' },
  { label: 'HUB',        path: '/' },
  { label: 'Field Agent',path: '/field-agent' },
  { label: 'Workforce',  path: '/workforce' },
] as const

type ActivePortal = typeof PORTAL_TABS[number]['label']

interface Props {
  activePortal: ActivePortal
}

export default function DemoHeader({ activePortal }: Props) {
  const location = useLocation()

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-0 flex items-stretch gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 py-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">ARXConnect</span>
            <span className="ml-2 text-xs font-medium text-primary-foreground/60 hidden sm:inline">
              Fax QS / PA Approved
            </span>
          </div>
        </div>

        {/* Portal tab nav */}
        <nav className="flex items-stretch flex-1 justify-center overflow-x-auto">
          {PORTAL_TABS.map((tab) => {
            const isActive =
              tab.label === activePortal ||
              (tab.path !== '/' && location.pathname.startsWith(tab.path)) ||
              (tab.path === '/' && location.pathname === '/')

            return (
              <Link
                key={tab.label}
                to={tab.path}
                className={cn(
                  'flex items-center px-3 sm:px-4 py-0 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150',
                  isActive
                    ? 'text-white border-accent'
                    : 'text-primary-foreground/60 border-transparent hover:text-primary-foreground/90 hover:border-primary-foreground/30',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
