import React from 'react'
import { useWorkflow } from '@/hooks/useWorkflow'
import { cn } from '@/lib/utils'

export default function CaseStateBar() {
  const { step, stepLabels } = useWorkflow()

  return (
    <div className="flex items-center w-full gap-0">
      {stepLabels.map(({ label }, i) => {
        const stepNum  = i + 1
        const isDone   = step > stepNum
        const isActive = step === stepNum

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all duration-300',
                isDone   && 'bg-blue-600 border-blue-600 text-white',
                isActive && 'bg-white border-blue-600 text-blue-600 shadow shadow-blue-200',
                !isDone && !isActive && 'bg-white border-slate-300 text-slate-400',
              )}>
                {isDone ? (
                  <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : stepNum}
              </div>
              <span className={cn(
                'text-[10px] text-center leading-tight hidden sm:block max-w-[70px]',
                isActive && 'text-blue-700 font-semibold',
                isDone   && 'text-blue-500',
                !isDone && !isActive && 'text-slate-400',
              )}>
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-1 rounded-full transition-all duration-500 mb-4',
                step > stepNum ? 'bg-blue-500' : 'bg-slate-200',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
