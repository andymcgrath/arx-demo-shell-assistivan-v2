import { useNavigate } from "@/lib/portalRouter";

export default function DeliveryConfirmation() {
  const navigate = useNavigate();

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12 bg-arx-primary">
        <div className="text-center max-w-sm mx-auto">
          <div className="relative flex items-center justify-center w-36 h-36 mx-auto mb-8">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <span
                key={deg}
                className="absolute w-5 h-0.5 rounded-full"
                style={{ transform: `rotate(${deg}deg) translateX(58px)`, backgroundColor: "rgba(255,255,255,0.4)" }}
              />
            ))}
            <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-5 leading-snug">
            Thanks!<br />Your details were received
          </h1>

          <p className="text-white/90 text-sm leading-relaxed mb-2">
            We will make every effort to accommodate your requested date.
          </p>
          <p className="text-white/90 text-sm leading-relaxed mb-12">
            Once shipped, you will receive a text message with confirmation and tracking.
          </p>

          <button
            onClick={() => { navigate("/order-tracker"); }}
            className="w-full bg-white text-arx-primary font-semibold py-4 rounded-lg hover:bg-arx-sky transition-colors"
          >
            Got it
          </button>
        </div>
    </main>
  );
}
