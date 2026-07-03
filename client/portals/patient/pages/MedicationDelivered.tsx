import { ArrowRight, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useChatContext } from "@patient/components/ChatContext";
import ProgramLogo from "@patient/components/brand/ProgramLogo";
import { PROGRAM } from "@patient/config/branding";
const DELIVERY_DATE = "May 30, 10:00 AM";

export default function MedicationDelivered() {
  const navigate = useNavigate();
  const { openChat } = useChatContext();

  return (
    <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">

          {/* Arrived card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
              <span className="text-xs text-arx-body-copy">{DELIVERY_DATE}</span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold leading-snug text-arx-slate">Your medication has arrived!</h2>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky">
                <span className="text-xl">🚚</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">It's time to get ready for your first dose.</p>
            <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
              Before starting, review the step-by-step guide to learn how to store, prepare, and take Assistivan safely.
            </p>

            <button className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 mb-3 hover:bg-arx-primary-dark transition-colors">
              <span>Review guide</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={openChat}
              className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
            >
              <span>Have questions? Start a chat</span>
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
            <button className="w-full flex items-center gap-4 text-white rounded-xl px-4 py-3.5 bg-arx-primary hover:bg-arx-primary-dark transition-colors">
              <ProgramLogo variant="white" className="h-10 w-auto max-w-[120px] object-contain flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-xs text-white/80">Review prescribing information</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>
          </section>

          {/* Suggested section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-arx-primary inline-block" />
              <h3 className="font-semibold text-sm text-arx-primary">Suggested for you</h3>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
              <img
                src="https://images.pexels.com/photos/7176319/pexels-photo-7176319.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Patient and doctor"
                className="w-full h-40 object-cover"
              />
              <div className="p-5">
                <h4 className="text-lg font-bold mb-2 text-arx-slate">What makes Assistivan different?</h4>
                <p className="text-sm leading-relaxed mb-4 text-arx-body-copy">
                  We know everybody has a unique journey and experience — but sometimes it helps to hear from someone like you.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 font-semibold text-sm text-arx-primary hover:text-arx-primary-80 transition-colors"
                >
                  Learn more <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

        </div>
    </main>
  );
}
