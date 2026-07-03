import React from 'react'
import DemoHeader from '@/components/DemoHeader'
import CaseStateBar from '@/components/CaseStateBar'
import FieldPortal from '@/portals/field/index'

export default function Field() {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoHeader activePortal="Field" />
      <div className="px-4 sm:px-6 py-3 border-b bg-violet-50 border-violet-200">
        <CaseStateBar />
      </div>
      <div className="flex-1 overflow-auto">
        <FieldPortal />
      </div>
    </div>
  )
}
