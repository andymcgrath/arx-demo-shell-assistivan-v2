import { useState } from "react";
import { ArrowRight, ChevronRight, Play, X } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useChatContext } from "@patient/components/ChatContext";
import ProgramLogo from "@patient/components/brand/ProgramLogo";
import { PROGRAM } from "@patient/config/branding";
const DELIVERY_DATE = "May 30, 10:00 AM";

// Admin-configured (Branding Admin → Education Video). Absent/blank
// embedUrl hides the whole card — see the `educationVideo &&` guard below.
const educationVideo = (PROGRAM as { educationVideo?: { title: string; description: string; thumbnail: string; embedUrl: string } }).educationVideo;
const hasEducationVideo = Boolean(educationVideo?.embedUrl);

export default function MedicationDelivered() {
  const navigate = useNavigate();
  const { openChat } = useChatContext();
  const [showPfVideo, setShowPfVideo] = useState(false);

  return (
    <main className="flex-grow pt-5 pb-8">
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

          {/* Education video — hidden entirely when no video is configured
              in Branding Admin (Program → Education Video). */}
          {hasEducationVideo && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-arx-primary inline-block" />
                <h3 className="font-semibold text-sm text-arx-primary">Education video</h3>
              </div>

              <button
                onClick={() => setShowPfVideo(true)}
                className="w-full bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden text-left group"
              >
                <div className="relative w-full h-40 bg-arx-slate/10">
                  {educationVideo!.thumbnail && (
                    <img
                      src={educationVideo!.thumbnail}
                      alt={educationVideo!.title}
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                      <Play className="w-6 h-6 text-arx-primary fill-arx-primary" />
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="text-lg font-bold mb-2 text-arx-slate">
                    {educationVideo!.title}
                  </h4>
                  {educationVideo!.description && (
                    <p className="text-sm leading-relaxed text-arx-body-copy">
                      {educationVideo!.description}
                    </p>
                  )}
                </div>
              </button>
            </section>
          )}

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

        {/*
         * Rendered inline (no portal) so it stays inside this page instead of
         * escaping to document.body. `absolute inset-0` resolves against this
         * `<main>` (`relative` above) rather than assuming a specific
         * ancestor is positioned — WF1-4 render this inside the iPhone
         * mockup (`.i17pro__screen`, itself positioned) while WF5 renders it
         * in the plain wide web panel with no such wrapper.
         */}
        {showPfVideo && hasEducationVideo && (
          <div
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPfVideo(false)}
          >
            <div
              className="bg-white rounded-2xl overflow-hidden w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-arx-borders">
                <span className="text-sm font-semibold text-arx-slate">{educationVideo!.title}</span>
                <button
                  onClick={() => setShowPfVideo(false)}
                  className="text-arx-body-copy hover:text-arx-slate"
                  aria-label="Close video"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src={`${educationVideo!.embedUrl}${educationVideo!.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  title={educationVideo!.title}
                />
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
