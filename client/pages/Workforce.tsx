import React from 'react'
import DemoHeader from '@/components/DemoHeader'
import CaseStateBar from '@/components/CaseStateBar'
import AnalyticsPortal from '@/portals/analytics/index'

export default function Workforce() {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoHeader activePortal="Workforce" />
      <div className="px-4 sm:px-6 py-3 border-b bg-teal-50 border-teal-200">
        <CaseStateBar />
      </div>
      <div className="flex-1 overflow-hidden">
        <AnalyticsPortal />
      </div>
    </div>
  )
}
