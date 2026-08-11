import { useNavigate } from "@/lib/portalRouter";
import { ChevronRight, ArrowRight, HelpCircle } from "lucide-react";
import { useChatContext } from "@/components/ChatContext";
import ProgramLogo from "@/components/brand/ProgramLogo";
import { PROGRAM, CHATBOT_ICON } from "@/config/branding";
import { hexToColorFilter } from "@/lib/brandFilter";

export default function PAStatus() {
  const navigate = useNavigate();
  const { openChat } = useChatContext();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <main className="flex-grow pt-5 pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">

          {/* PA Submitted card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
              <span className="text-xs text-arx-body-copy">{dateStr}, {timeStr}</span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold leading-snug text-arx-slate">Your PA has been submitted</h2>
              <button
                onClick={() => navigate("/pa-denied")}
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky hover:bg-arx-primary-30 transition-colors"
                aria-label="Advance to next stage"
              >
                <span className="text-lg font-bold text-arx-primary">Rx</span>
              </button>
            </div>

            <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">
              Your insurance company is reviewing the PA, which can take several days.
            </p>
            <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
              You don't need to do anything — we're handling it with your insurer. We'll notify you when an update is available.
            </p>

            <button
              onClick={openChat}
              className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 mb-3 hover:bg-arx-primary-dark transition-colors"
            >
              <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              <span>Have questions? Start a chat</span>
            </button>
            <button className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors">
              <span>Learn what's next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Prescriptions section */}
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
                <p className="text-xs text-arx-body-copy">PA submitted</p>
              </div>
              <ChevronRight className="w-5 h-5 text-arx-body-copy" />
            </button>
          </section>

          {/* Suggested section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-arx-primary inline-block" />
              <h3 className="font-semibold text-sm text-arx-primary">Suggested for you</h3>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="text-lg font-bold leading-snug text-arx-slate">
                  Prior Authorization (PA): What to Expect
                </h4>
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-arx-sky">
                  <HelpCircle className="w-5 h-5 text-arx-primary" />
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">
                PA is a routine insurance review to determine coverage for specific medications.
              </p>
              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                Learn how this process works, why it may be required, and what you can expect along the way.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg hover:bg-arx-primary-dark transition-colors"
              >
                Read more
              </button>
            </div>
          </section>

        </div>
    </main>
  );
}
