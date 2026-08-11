import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, ChevronRight, Phone, DollarSign } from "lucide-react";
import { useChatContext } from "@/components/ChatContext";
import ProgramLogo from "@/components/brand/ProgramLogo";
import { PROGRAM, CHATBOT_ICON } from "@/config/branding";
import { hexToColorFilter } from "@/lib/brandFilter";
import { usePersonaState } from "@/engine/WorkflowProvider";

export default function PADenied() {
  const navigate = useNavigate();
  const { openChat } = useChatContext();
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const isCoA = flowType === 'CoA_DTP';
  // iAssist_PAP (WF5) is the one flow with a real appealStatus field (see
  // workflows/iAssistPap.ts) — its copy below reacts to whether an appeal
  // has actually been filed instead of always claiming one has. Every other
  // flow reaching this screen (WF1) keeps its original, unconditional
  // "we submitted an appeal" copy untouched — appealStatus stays 'none'
  // forever for those flows, so branching on it there would silently change
  // established WF1 behavior no one asked to change.
  const isIAssistPap = flowType === 'iAssist_PAP';
  // !== 'none' rather than === 'initiated': appealStatus advances to
  // 'approved' once the CRM agent opens the Appeals tab (see
  // workflows/iAssistPap.ts's APPROVE_APPEAL) — this patient-facing "we've
  // filed an appeal" copy is still accurate at that point, so it shouldn't
  // revert to the pre-appeal copy just because the payer has since responded.
  const appealFiled = workflowData.appealStatus !== 'none';
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <main className="flex-grow pt-5 pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">

          {/* PA Denied card */}
          {isCoA ? (
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-center justify-between mb-4">
                <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
                <span className="text-xs text-arx-body-copy">{dateStr}, {timeStr}</span>
              </div>

              <h2 className="text-xl font-bold leading-snug text-arx-slate mb-3">
                Your insurance denied coverage — but you have options
              </h2>

              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                Your insurer denied the prior authorization for Assistivan. The good news: you may be eligible for our cash pay program at a significantly reduced cost.
              </p>

              <button
                onClick={() => navigate("/delivery-payment")}
                className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 mb-3 hover:bg-arx-primary-dark transition-colors"
              >
                <span>View cash pay offer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={openChat}
                className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
              >
                <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: hexToColorFilter(PROGRAM.colors.primary) }} />
                <span>Have questions? Start a chat</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-center justify-between mb-4">
                <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
                <span className="text-xs text-arx-body-copy">{dateStr}, {timeStr}</span>
              </div>

              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold leading-snug text-arx-slate">
                  We're still working on getting Assistivan approved
                </h2>
                <button
                  onClick={() => navigate("/pa-approved")}
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky hover:bg-arx-primary-30 transition-colors"
                  aria-label="Advance to next stage"
                >
                  <span className="text-lg font-bold text-arx-primary">Rx</span>
                </button>
              </div>

              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                {isIAssistPap
                  ? appealFiled
                    ? "Your insurance company denied payment for Assistivan, but we've already filed an appeal on your behalf. We'll let you know when we have an update. It could take up to 10 days."
                    : "Your insurance company denied payment for Assistivan. We're reviewing your options and will let you know what's next."
                  : "Your insurance company denied payment for Assistivan, but we submitted an appeal. We'll let you know when we have an update. It could take up to 10 days."}
              </p>

              <button className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 mb-3 hover:bg-arx-primary-dark transition-colors">
                <span>Learn what to expect</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={openChat}
                className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
              >
                <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: hexToColorFilter(PROGRAM.colors.primary) }} />
                <span>Have questions? Start a chat</span>
              </button>
            </div>
          )}

          {/* Real-time updates card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold leading-snug text-arx-slate">
                Real-time updates about your case, anytime!
              </h2>
              <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-arx-sky">
                <Phone className="w-5 h-5 text-arx-primary" />
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
              If you'd like a live status update on your prescription, you can call our Virtual Assistant at{" "}
              <a href="tel:3163940074" className="font-semibold underline text-arx-primary">
                (316) 394-0074
              </a>.
            </p>

            <button className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 mb-3 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors">
              <Phone className="w-4 h-4" />
              <span>Call Virtual Assistant</span>
            </button>

            <p className="text-xs text-center text-arx-body-copy">Standard call or carrier rates may apply.</p>
          </div>

          {/* Prescriptions section - hidden for CoA */}
          {!isCoA && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-arx-primary inline-block" />
                  <span className="font-bold text-arx-slate text-base">Prescriptions</span>
                </div>
                <button className="flex items-center gap-1 text-sm font-semibold text-arx-primary hover:text-arx-primary-80 transition-colors">
                  View all <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <button className="w-full flex items-center gap-4 text-arx-slate rounded-xl px-4 py-3.5 border-2 border-arx-borders hover:bg-arx-background transition-colors">
                <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain flex-shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-xs text-arx-body-copy">
                    {isIAssistPap ? (appealFiled ? "Appeal submitted" : "Reviewing your options") : "Appeal submitted"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-arx-body-copy" />
              </button>
            </section>
          )}

          {/* Suggested section - hidden for CoA */}
          {!isCoA && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-arx-primary inline-block" />
                <h3 className="font-semibold text-sm text-arx-primary">Suggested for you</h3>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
                <div className="flex items-center justify-between mb-3">
                  <img src={PROGRAM.logo.colors} alt={PROGRAM.name} className="h-6 w-auto max-w-[100px] object-contain" />
                  <span className="text-xs text-arx-body-copy">{dateStr}, {timeStr}</span>
                </div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="text-lg font-bold leading-snug text-arx-slate">
                    Learn about financial assistance programs
                  </h4>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-arx-sky">
                    <DollarSign className="w-5 h-5 text-arx-primary" />
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                  {isIAssistPap
                    ? appealFiled
                      ? "Your appeal is still under review. Even if your insurance denies coverage, there are available programs to help you."
                      : "Even if your insurance denies coverage, there are available programs to help you."
                    : "Your appeal is still under review. Even if your insurance denies coverage, there are available programs to help you."}
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="w-full font-semibold py-3.5 rounded-lg border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
                >
                  Learn more
                </button>
              </div>
            </section>
          )}

        </div>
    </main>
  );
}
