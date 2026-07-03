import React from 'react'
import DemoHeader from '@/components/DemoHeader'
import CaseStateBar from '@/components/CaseStateBar'
import ProviderPortal from '@/portals/provider/index'

export default function Provider() {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoHeader activePortal="Provider" />
      <div className="px-4 sm:px-6 py-3 border-b bg-sky-50 border-sky-200">
        <CaseStateBar />
      </div>
      <div className="flex-1 overflow-auto">
        <ProviderPortal />
      </div>
    </div>
  )
}
