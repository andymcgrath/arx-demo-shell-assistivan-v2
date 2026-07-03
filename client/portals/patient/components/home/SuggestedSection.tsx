const CHATBOT_ICON = "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fcd6e286159a142f4ba939dc20997b2da";

interface SuggestedCard {
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
}

const suggestions: SuggestedCard[] = [
  {
    title: "Technical Help — Available 24/7",
    description:
      "Get 24/7 support for questions about prior authorization, medication delivery, financial assistance, and more.",
    cta: "Chat with us",
    icon: <img src={CHATBOT_ICON} alt="" className="w-6 h-6 object-contain" style={{ filter: "brightness(0) invert(1)" }} />,
  },
];

export default function SuggestedSection() {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-arx-primary inline-block" />
        <span className="font-bold text-arx-slate text-base">Suggested for you</span>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-4">
        {suggestions.map((item) => (
          <div key={item.title} className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold leading-snug text-arx-slate">{item.title}</h3>
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-arx-primary">
                {item.icon}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-arx-body-copy">{item.description}</p>
            <button className="mt-5 w-full text-arx-primary font-semibold py-3.5 rounded-lg transition-colors border-2 border-arx-primary bg-transparent hover:bg-arx-primary hover:text-white">
              {item.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
