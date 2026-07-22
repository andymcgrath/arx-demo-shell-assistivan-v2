import React from 'react'
import DemoHeader from '@/components/DemoHeader'
import CaseStateBar from '@/components/CaseStateBar'
import StateHistory from '@/components/StateHistory'
import { useWorkflow } from '@/hooks/useWorkflow'
import { Mail, ShieldCheck, CheckCircle2, Pill, PhoneCall, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

function NextStepCard() {
  const { state } = useWorkflow()

  type StepContent = {
    iconBg: string
    iconColor: string
    icon: React.ElementType
    title: string
    body: string
  }

  const contentMap: Partial<Record<string, StepContent>> = {
    referral_received: {
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: Mail,
      title: 'Please Reply to Our Text Message',
      body: 'We sent a consent request to your mobile number. Reply YES to authorize electronic communication about your therapy.',
    },
    patient_onboarding: {
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: Mail,
      title: 'Complete Your Enrollment',
      body: 'Please log in to the patient portal to complete enrollment, confirm your information, and sign your consent form.',
    },
    bi_investigation: {
      iconBg: 'bg-green-50', iconColor: 'text-green-600', icon: ShieldCheck,
      title: 'Consent Confirmed',
      body: 'Your care team is reviewing your insurance benefits. No action needed from you right now.',
    },
    pa_submission: {
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: ShieldCheck,
      title: 'Prior Authorization Initiated',
      body: "Your provider is completing the prior authorization questionnaire. You'll be notified once submitted.",
    },
    pa_pending: {
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: ShieldCheck,
      title: 'Prior Authorization Submitted',
      body: "We've submitted your prior authorization to your insurance. We'll notify you as soon as we receive a decision.",
    },
    patient_scheduling: {
      iconBg: 'bg-green-50', iconColor: 'text-green-600', icon: CheckCircle2,
      title: 'Your PA Has Been Approved',
      body: 'Visit our fulfillment center via the link in your text message to complete the next step.',
    },
    pharmacy_dispatch: {
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: Package,
      title: 'Select Your Pharmacy',
      body: 'Please choose your preferred specialty pharmacy so we can dispatch your prescription.',
    },
    medication_tracking: {
      iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: Pill,
      title: 'Your Prescription Is Being Prepared',
      body: 'Your prescription has been sent to the specialty pharmacy and is being prepared for shipment.',
    },
    delivered: {
      iconBg: 'bg-green-50', iconColor: 'text-green-600', icon: CheckCircle2,
      title: "First Dose Delivered — You're on Therapy!",
      body: 'Your first supply has been delivered. Your care team will reach out about 30 days before your next refill.',
    },
  }

  const content = contentMap[state] ?? contentMap['referral_received']!
  const Icon = content.icon

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Your next step</h2>
      <div className="flex items-start gap-4">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', content.iconBg)}>
          <Icon size={20} className={content.iconColor} />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-slate-800 mb-1">{content.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{content.body}</p>
        </div>
      </div>
    </div>
  )
}

function CareTeamCard() {
  const { state } = useWorkflow()
  const pharmacyAssigned = ['pharmacy_dispatch', 'medication_tracking', 'delivered'].includes(state)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Your care team</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <PhoneCall size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">HUB Coordinator</p>
            <p className="text-sm font-semibold text-slate-800">ArxConnect Patient Services</p>
          </div>
          <a href="tel:5558000000" className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">
            (555) 800-0000
          </a>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <Pill size={16} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Specialty Pharmacy</p>
            {pharmacyAssigned ? (
              <p className="text-sm font-semibold text-slate-800">ARX Specialty Pharmacy</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Assigned after PA approval</p>
            )}
          </div>
          {pharmacyAssigned && (
            <a href="tel:5559001234" className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">
              (555) 900-1234
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Patient() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DemoHeader activePortal="Patient" />
      <div className="bg-blue-50 border-b-[3px] border-blue-500 px-4 sm:px-6 py-5">
        <div className="max-w-[680px] mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal</h1>
          <p className="text-sm text-slate-600 mt-0.5 mb-4">Jascayd 18mg intake in progress</p>
          <CaseStateBar />
        </div>
      </div>
      <main className="max-w-[680px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <NextStepCard />
        <CareTeamCard />
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Your recent notifications
          </h2>
          <StateHistory filterPortal="Patient" maxEvents={10} />
        </div>
      </main>
    </div>
  )
}
