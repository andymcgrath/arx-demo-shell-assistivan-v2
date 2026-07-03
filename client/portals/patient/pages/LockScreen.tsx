import { Flashlight, Camera } from "lucide-react";
import { useEffect, useState } from "react";

export default function LockScreen() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [temp, setTemp] = useState<number>(72);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTime(`${hours}:${minutes}`);

      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
      };
      setDate(now.toLocaleDateString("en-US", options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-black relative overflow-hidden flex flex-col">

      {/* Content container */}
      <div className="relative z-10 flex-1 flex flex-col w-full px-6">
        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Date */}
          <p className="text-white text-base mb-2 font-light tracking-wide">{date || "Loading..."}</p>

          {/* Time - large and prominent */}
          <h1 className="text-white text-7xl font-thin mb-4 tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 300 }}>
            {time || "00:00"}
          </h1>

          {/* Temperature widget */}
          <div className="flex flex-col items-center mb-12">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fa49cc876147843eda45d3b9536bfb617?format=webp&width=800&height=1200"
              alt="Temperature indicator"
              className="w-64 h-40 object-contain"
            />
          </div>
        </div>

        {/* Bottom controls section */}
        <div className="flex flex-col items-center justify-end pb-6">
          {/* Icons - flashlight and camera */}
          <div className="flex justify-between w-full max-w-xs mb-4">
            <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition">
              <Flashlight className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
            <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition">
              <Camera className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
          </div>

          {/* Swipe to open text */}
          <p className="text-white text-xs font-light mb-2">Swipe up to open</p>

          {/* Slide indicator line */}
          <div className="w-10 h-0.5 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
