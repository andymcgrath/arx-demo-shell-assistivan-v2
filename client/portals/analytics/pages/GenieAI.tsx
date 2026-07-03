import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
// v2 — single symmetric waveform with speaker-turn coloring
type AppState = 1 | 2 | 3 | 4;

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

const BLUE = "#1976d2";
const GREEN = "#4caf50";
const TEAL = "#00a5b4";
const BORDER = "#e0e0e0";

// ─── Waveform Data ────────────────────────────────────────────────────────────
// Turn fractions derived from word-count proportions in the actual transcript.
// agent:true = blue (Jordan/AssistRx), agent:false = gray (Daniel/patient).
const TURNS: { from: number; to: number; agent: boolean }[] = [
  { from: 0.000, to: 0.025, agent: true  }, // Jordan: greeting
  { from: 0.025, to: 0.074, agent: false }, // Daniel: waiting 3 weeks, running out
  { from: 0.074, to: 0.117, agent: true  }, // Jordan: pulling up case, DOB request
  { from: 0.117, to: 0.122, agent: false }, // Daniel: "March 14th, 1986"
  { from: 0.122, to: 0.188, agent: true  }, // Jordan: 18 days, being transparent
  { from: 0.188, to: 0.224, agent: false }, // Daniel: Crohn's, two injections left
  { from: 0.224, to: 0.293, agent: true  }, // Jordan: urgent, medical review team
  { from: 0.293, to: 0.302, agent: false }, // Daniel: "So it is not denied yet?"
  { from: 0.302, to: 0.396, agent: true  }, // Jordan: not denied, peer-to-peer review
  { from: 0.396, to: 0.434, agent: false }, // Daniel: last two doses, running out
  { from: 0.434, to: 0.511, agent: true  }, // Jordan: bridge supply program
  { from: 0.511, to: 0.539, agent: false }, // Daniel: "seriously? nobody told me"
  { from: 0.539, to: 0.612, agent: true  }, // Jordan: fair question, submitting now
  { from: 0.612, to: 0.625, agent: false }, // Daniel: "Yes please"
  { from: 0.625, to: 0.701, agent: true  }, // Jordan: submitted bridge + escalation
  { from: 0.701, to: 0.716, agent: false }, // Daniel: "what if denied?"
  { from: 0.716, to: 0.795, agent: true  }, // Jordan: formal appeal, not alone
  { from: 0.795, to: 0.836, agent: false }, // Daniel: reassured, almost gave up
  { from: 0.836, to: 0.884, agent: true  }, // Jordan: don't pay out-of-pocket
  { from: 0.884, to: 0.905, agent: false }, // Daniel: wish I called 3 weeks ago
  { from: 0.905, to: 0.930, agent: true  }, // Jordan: here any time
  { from: 0.930, to: 0.945, agent: false }, // Daniel: "Thank you Jordan"
  { from: 0.945, to: 0.993, agent: true  }, // Jordan: closing, call back anytime
  { from: 0.993, to: 0.997, agent: false }, // Daniel: "Will do. Bye."
  { from: 0.997, to: 1.000, agent: true  }, // Jordan: "Goodbye Daniel."
];

// Symmetric single-channel waveform: bars go both up and down from the center
const N_BARS = 380;
interface WaveBar { h: number; agent: boolean }
const WAVE: WaveBar[] = Array.from({ length: N_BARS }, (_, i) => {
  const phase = i / N_BARS;
  const turn = TURNS.find(t => phase >= t.from && phase < t.to) ?? TURNS[TURNS.length - 1];
  const amp = Math.abs(
    Math.sin(i * 1.31 + 0.4) * Math.cos(i * 2.77 + 1.1) * Math.sin(i * 5.13 + 0.9)
  );
  return { h: Math.max(3, amp * 52), agent: turn.agent };
});

// Key moments from the transcript mapped to waveform positions
const BUBBLES = [
  { label: "prior auth — 18 days",      xFrac: 0.155 }, // Jordan explaining delay
  { label: "bridge supply program",      xFrac: 0.472 }, // Jordan introduces bridge
  { label: "peer-to-peer escalation",    xFrac: 0.663 }, // Jordan confirms escalation
];

const APP_SEGS = [
  { label: "CRM",      color: "#9e9e9e", flex: 12 },
  { label: "Portal",   color: "#c9b400", flex: 28 },
  { label: "CRM",      color: "#9e9e9e", flex: 30 },
  { label: "Facebook", color: "#9b59b6", flex: 30 },
];

// ─── Chat result data ─────────────────────────────────────────────────────────
const CHAT_CATEGORIES = [
  {
    category: "Prior Authorization Delays",
    pct: "45%",
    rows: [
      { date: "Sep 19, 2024", quote: "My doctor submitted the prior auth weeks ago and I still haven't heard anything" },
      { date: "Sep 19, 2024", quote: "I can't afford to wait any longer, I need this medication now" },
      { date: "Sep 18, 2024", quote: "The insurance keeps denying the PA and I don't understand what else my doctor needs to submit", highlight: true },
    ],
  },
  {
    category: "Out-of-Pocket Cost Concerns",
    pct: "22%",
    rows: [
      { date: "Sep 18, 2024", quote: "My copay for this specialty drug is over two thousand dollars, I can't afford that" },
      { date: "Sep 16, 2024", quote: "Is there any patient assistance program I can apply for to help cover the cost?" },
    ],
  },
  {
    category: "Insurance Coverage Issues",
    pct: "10%",
    rows: [
      { date: "Sep 19, 2024", quote: "My plan switched and now my medication isn't covered under the new formulary" },
      { date: "Sep 17, 2024", quote: "I got a letter saying I need to try a step therapy drug first before they'll cover mine" },
    ],
  },
  { category: "Other", pct: "23%", rows: [] },
];

const FOLLOW_UP_PILLS = ["What is the average PA approval time?", "Suggest action items to reduce PA denials"];
const SUGGESTED_PILLS = ["What are the top reasons for prior auth denials?", "What is the PA denial rate by payer?", "Which drugs have the highest denial rates?"];

// ─── Robot Mascot ─────────────────────────────────────────────────────────────
function RobotMascot() {
  return (
    <svg width="140" height="178" viewBox="0 0 160 200" fill="none">
      <ellipse cx="80" cy="196" rx="46" ry="7" fill="#d0d0d0" opacity="0.5" />
      <rect x="46" y="166" width="24" height="28" rx="8" fill="#90a4ae" />
      <rect x="90" y="166" width="24" height="28" rx="8" fill="#90a4ae" />
      <rect x="40" y="188" width="34" height="11" rx="5" fill="#78909c" />
      <rect x="86" y="188" width="34" height="11" rx="5" fill="#78909c" />
      <rect x="28" y="88" width="104" height="82" rx="12" fill="#b0bec5" />
      <polygon points="68,116 80,136 92,116" fill={BLUE} opacity="0.9" />
      <rect x="3" y="93" width="28" height="14" rx="7" fill="#b0bec5" />
      <rect x="129" y="93" width="28" height="14" rx="7" fill="#b0bec5" />
      <rect x="34" y="28" width="92" height="66" rx="14" fill="#cfd8dc" />
      <rect x="76" y="8" width="8" height="22" fill="#90a4ae" rx="3" />
      <circle cx="80" cy="7" r="7" fill="#4fc3f7" />
      <circle cx="60" cy="55" r="15" fill="#263238" />
      <circle cx="100" cy="55" r="15" fill="#263238" />
      <circle cx="62" cy="53" r="9" fill="#4fc3f7" />
      <circle cx="102" cy="53" r="9" fill="#4fc3f7" />
      <circle cx="64" cy="51" r="4.5" fill="#fff" />
      <circle cx="104" cy="51" r="4.5" fill="#fff" />
      <rect x="54" y="78" width="52" height="8" rx="4" fill="#90a4ae" />
      <rect x="59" y="80" width="8" height="4" rx="2" fill="#4fc3f7" />
      <rect x="71" y="80" width="8" height="4" rx="2" fill="#4fc3f7" />
      <rect x="83" y="80" width="8" height="4" rx="2" fill="#4fc3f7" />
    </svg>
  );
}

// ─── Small genie icon for chat ────────────────────────────────────────────────
function GenieIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 160 200" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="80" cy="80" r="74" fill="#cfd8dc" />
      <circle cx="60" cy="78" r="13" fill="#263238" />
      <circle cx="100" cy="78" r="13" fill="#263238" />
      <circle cx="62" cy="76" r="7.5" fill="#4fc3f7" />
      <circle cx="102" cy="76" r="7.5" fill="#4fc3f7" />
      <circle cx="64" cy="74" r="3.5" fill="#fff" />
      <circle cx="104" cy="74" r="3.5" fill="#fff" />
      <rect x="55" y="100" width="50" height="7" rx="3.5" fill="#90a4ae" />
    </svg>
  );
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────
function SpeechBubble({ text }: { text: string }) {
  return (
    <div style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px", maxWidth: 260, fontSize: 13, color: "#444", boxShadow: "0 2px 10px rgba(0,0,0,0.09)", lineHeight: 1.5 }}>
      {text}
      <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "10px solid #fff", filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.08))" }} />
    </div>
  );
}

// ─── Input Bar ────────────────────────────────────────────────────────────────
function InputBar({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [val, setVal] = useState("");
  const send = () => { if (val.trim()) { onSubmit(val); setVal(""); } };
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, background: "#fff", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && send()}
        placeholder="Ask anything about the selected data set"
        style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "7px 16px", fontSize: 13, color: "#333", outline: "none", background: "#fff" }}
      />
      <button title="Microphone" style={{ background: "none", border: "none", cursor: "pointer", color: TEAL }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <button onClick={send} style={{ background: "none", border: "none", cursor: "pointer", color: TEAL }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  );
}

// ─── Sub Nav ──────────────────────────────────────────────────────────────────
function SubNav({ screen }: { screen: "discover" | "analyze" }) {
  const primary = ["Discover", "Analyze", "Reports", "Design", "Tune"];
  const activeP = screen === "discover" ? "Discover" : "Analyze";
  const secondary = screen === "analyze" ? ["Categories", "Charts", "Root Cause", "Interactions", "AI Insights"] : ["Trends", "Theme", "All Topics"];
  const activeS = screen === "analyze" ? "AI Insights" : "Trends";

  return (
    <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", height: 38 }}>
        {primary.map(t => (
          <button key={t} style={{ background: "none", border: "none", borderBottom: t === activeP ? `2px solid ${BLUE}` : "2px solid transparent", color: t === activeP ? BLUE : "#555", fontWeight: t === activeP ? 600 : 400, fontSize: 13, padding: "0 14px", height: "100%", cursor: "pointer", marginBottom: -1 }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", height: 30 }}>
        {secondary.map(t => (
          <button key={t} style={{ background: "none", border: "none", borderBottom: t === activeS ? `2px solid ${BLUE}` : "2px solid transparent", color: t === activeS ? BLUE : "#666", fontWeight: t === activeS ? 600 : 400, fontSize: 12, padding: "0 12px", height: "100%", cursor: "pointer", marginBottom: -1 }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <button style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "4px 10px", background: "#fff", fontSize: 12, color: "#333", cursor: "pointer" }}>
      {icon} {text} <span style={{ fontSize: 10, color: "#aaa" }}>►</span>
    </button>
  );
}

// ─── Suggested query pill ─────────────────────────────────────────────────────
function QueryPill({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ border: `1px solid ${hov ? "#424242" : "#9e9e9e"}`, borderRadius: 20, padding: "5px 12px", background: "#fff", fontSize: 12, color: "#333", cursor: "pointer", whiteSpace: "nowrap" }}
    >
      {label}
    </button>
  );
}

// ─── Right Panel: GenAI Insights ──────────────────────────────────────────────
function RightPanel() {
  return (
    <div style={{ width: "35%", flexShrink: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>GenAI Insights</span>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13 }}>&raquo;</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", fontSize: 13, display: "flex", flexDirection: "column", gap: 16 }}>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>Summary</div>
          <p style={{ color: "#555", lineHeight: 1.55, margin: 0, fontSize: 12 }}>Primary driver of call volume is prior authorization delays and insurance denials. Patient sentiment is mostly frustrated but improves significantly after agents introduce bridge supply and appeal options. Resolution rate is above 60% when escalation pathways are offered.</p>
        </section>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>Sentiment Distribution</div>
          <div style={{ display: "flex", height: 18, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ flex: 15, background: "#e74c3c" }} />
            <div style={{ flex: 20, background: "#c9a0a0" }} />
            <div style={{ flex: 25, background: "#9e9e9e" }} />
            <div style={{ flex: 15, background: "#81c784" }} />
            <div style={{ flex: 25, background: "#2e7d32" }} />
          </div>
        </section>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>Call Purpose Classification</div>
          {[["PA Denial / Delay", 45], ["Formulary / Step Therapy", 25], ["Cost & Copay Concerns", 20], ["Other", 10]].map(([label, pct]) => (
            <div key={String(label)} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "#444" }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ height: 7, background: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: BLUE, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </section>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>Resolution Status</div>
          <div style={{ display: "flex", height: 18, borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ flex: 35, background: "#c8a0a0" }} />
            <div style={{ flex: 65, background: "#4caf50" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666" }}>
            <span>Unresolved: 38%</span>
            <span>Resolved: 62%</span>
          </div>
        </section>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>Resolution Pathway</div>
          {[["PA approved after appeal", 62], ["Bridge supply provided", 24]].map(([label, pct]) => (
            <div key={String(label)} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "#444" }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ height: 7, background: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#f39c12", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// ─── Chat Bot Response Card ───────────────────────────────────────────────────
function BotResponseCard({ onRowClick }: { onRowClick: () => void }) {
  const [hovRow, setHovRow] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <GenieIcon />
      <div style={{ flex: 1, background: "#fff", borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.10)", padding: 16, fontSize: 13 }}>
        <p style={{ color: "#666", margin: "0 0 12px", fontSize: 12 }}>Here are the top drivers of prior authorization issues for the selected datasets</p>
        {CHAT_CATEGORIES.map((cat) => (
          <div key={cat.category} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 5, borderBottom: `1px solid #eee`, marginBottom: 2 }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>•</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{cat.category}</span>
              <span style={{ color: "#888", fontSize: 12 }}>({cat.pct} of calls)</span>
            </div>
            {cat.rows.map((row) => {
              const key = `${cat.category}-${row.date}-${row.quote}`;
              const isHov = hovRow === key;
              return (
                <div
                  key={key}
                  onClick={onRowClick}
                  onMouseEnter={() => setHovRow(key)}
                  onMouseLeave={() => setHovRow(null)}
                  style={{ display: "flex", gap: 12, padding: "6px 6px", borderBottom: `1px solid #f0f0f0`, cursor: "pointer", background: (row as {highlight?: boolean}).highlight || isHov ? "#f5f5f5" : "transparent" }}
                >
                  <span style={{ width: 90, flexShrink: 0, color: "#999", fontSize: 11 }}>{row.date}</span>
                  <span style={{ fontSize: 12, color: "#444", fontStyle: "italic" }}>"{row.quote}"</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const AUDIO_URL = "https://cdn.builder.io/o/assets%2F4c828a6b97e546bc967a796675ca457e%2F25de4458f22c4357b07281e65815444b?alt=media&token=1910b6c8-c67b-4e0d-b43a-5dc0a731566a&apiKey=4c828a6b97e546bc967a796675ca457e";

// PHI segments defined as fractions of total call duration
// Patient name "Daniel Mercer" ≈ turn 2 start; DOB "March 14th, 1986" ≈ turn 4
const PHI_SEGMENTS = [
  { from: 0.0324, to: 0.0396, label: "Patient Name" }, // 9s–11s / 278s actual duration
  { from: 0.1367, to: 0.1439, label: "Date of Birth" }, // 38s–40s / 278s actual duration
];

// ─── Waveform Player ──────────────────────────────────────────────────────────
function WaveformPlayer({ onClose }: { onClose: () => void }) {
  const barW = 2;
  const gap = 1;
  const step = barW + gap;
  const HALF = 52;
  const TIMELINE_H = 20;
  const VH = HALF * 2 + TIMELINE_H;
  const VW = N_BARS * step;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [phiActive, setPhiActive] = useState(false);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const frac = a.currentTime / a.duration;
    setCurrentTime(a.currentTime);
    setProgress(frac);
    // Auto-mute when inside a PHI segment
    const inPHI = PHI_SEGMENTS.some(s => frac >= s.from && frac <= s.to);
    setPhiActive(inPHI);
    a.muted = inPHI;
  };

  const handleEnded = () => { setPlaying(false); setPhiActive(false); };
  const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };

  const seek = (e: React.MouseEvent<SVGRectElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    a.currentTime = frac * a.duration;
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const playheadX = progress * VW;

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderTop: `2px solid ${BLUE}`, borderRadius: 6, background: "#fff", overflow: "hidden" }}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={AUDIO_URL}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: `1px solid ${BORDER}`, background: "#f5f5f5", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>Interaction</span>
        <span style={{ color: "#888", fontSize: 12 }}>↑ ↓</span>
        <span style={{ fontSize: 11, color: "#555" }}>Date/Time: 09/19/2024 11:28:41 AM</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#555"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        <span style={{ fontSize: 11, color: "#333", fontWeight: 500 }}>Park, Natalie</span>
        <span style={{ color: "#888", fontSize: 11 }}>ℹ</span>
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          title={playing ? "Pause" : "Play"}
          style={{ background: BLUE, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 6 }}
        >
          {playing
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>
        {/* Time display */}
        <span style={{ fontSize: 11, color: "#555", fontVariantNumeric: "tabular-nums" }}>
          {fmt(currentTime)} / {duration ? fmt(duration) : "--:--"}
        </span>
        {/* PHI mute badge — shown when audio is being suppressed */}
        {phiActive && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#b71c1c", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, letterSpacing: 0.3 }}>
            🔇 PHI REDACTED
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>✕</button>
      </div>

      {/* Single-channel symmetric waveform — color per speaker turn */}
      <div style={{ background: "#fff", padding: "4px 0 0" }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          style={{ width: "100%", height: HALF * 2 + TIMELINE_H, display: "block", cursor: "pointer" }}
          preserveAspectRatio="none"
        >
          {/* Invisible click-to-seek overlay */}
          <rect x="0" y="0" width={VW} height={HALF * 2} fill="transparent" onClick={seek} />
          {/* Subtle center baseline */}
          <line x1="0" y1={HALF} x2={VW} y2={HALF} stroke="#e0e0e0" strokeWidth="0.5" />

          {/* Symmetric bars — each bar goes UP and DOWN from center, colored by speaker */}
          {WAVE.map(({ h, agent }, i) => (
            <rect
              key={i}
              x={i * step}
              y={HALF - h}
              width={barW}
              height={h * 2}
              fill={agent ? "#42a5f5" : "#bdbdbd"}
              opacity={agent ? 0.9 : 0.8}
            />
          ))}

          {/* PHI redaction overlays — striped red bands over muted segments */}
          {PHI_SEGMENTS.map((seg, idx) => {
            const rx = seg.from * VW;
            const rw = (seg.to - seg.from) * VW;
            return (
              <g key={idx} style={{ pointerEvents: "none" }}>
                {/* Red-tinted overlay */}
                <rect x={rx} y={0} width={rw} height={HALF * 2} fill="#b71c1c" opacity="0.18" />
                {/* Top + bottom border lines */}
                <rect x={rx} y={0} width={rw} height={2} fill="#b71c1c" opacity="0.7" />
                <rect x={rx} y={HALF * 2 - 2} width={rw} height={2} fill="#b71c1c" opacity="0.7" />
                {/* 🔒 PHI label */}
                <rect x={rx + rw / 2 - 22} y={HALF - 10} width={44} height={18} rx="3" fill="#b71c1c" opacity="0.85" />
                <text x={rx + rw / 2} y={HALF + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700" fontFamily="Inter,sans-serif">🔒 PHI</text>
              </g>
            );
          })}
          {/* Playhead */}
          <line x1={playheadX} y1={0} x2={playheadX} y2={HALF * 2} stroke={BLUE} strokeWidth="1.4" opacity="0.65" />

          {/* Timeline labels */}
          {[1, 2, 3].map(tick => {
            const tx = (tick / 4) * VW;
            return (
              <g key={tick}>
                <line x1={tx} y1={HALF * 2} x2={tx} y2={HALF * 2 + 5} stroke="#ccc" strokeWidth="0.8" />
                <text x={tx} y={HALF * 2 + TIMELINE_H - 3} textAnchor="middle" fontSize="9" fill="#aaa" fontFamily="Inter,sans-serif">{`0${tick}:00`}</text>
              </g>
            );
          })}
        </svg>

        {/* Annotation tags row — HTML pills positioned proportionally below waveform */}
        <div style={{ position: "relative", height: 28, margin: "2px 0" }}>
          {BUBBLES.map((b, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${b.xFrac * 100}%`,
                transform: "translateX(-50%)",
                background: "#fff",
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 10,
                color: "#333",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GenieAI() {
  const [state, setState] = useState<AppState>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, state]);

  const sendQuery = (q: string) => {
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setState(3);
  };

  return (
    <div style={{ background: "#f4f6f9", minHeight: "calc(100vh - 48px)", fontFamily: "Inter, sans-serif", fontSize: 13, display: "flex", flexDirection: "column", marginBottom: 100 }}>
      <SubNav screen="analyze" />

      {/* Page title + filter bar */}
      <div style={{ padding: "14px 24px 10px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a202c", marginBottom: 10 }}>AI Insights</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill icon="🌐" text="My Data Set (5,008)" />
            <Pill icon="✏️" text="Prior Auth (2,847)" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555" }}>
            <span>ℹ Showing insights for <a href="#" onClick={e => e.preventDefault()} style={{ color: BLUE }}>1-100 top interactions</a></span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>◄</button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>►</button>
            <button style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", background: "#fff", cursor: "pointer", fontSize: 12 }}>⤓ Export</button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: 12, padding: "0 24px 24px", flex: 1, marginBottom: 50 }}>
        {/* Left column */}
        <div style={{ flex: "0 0 65%", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>

          {/* Green box */}
          <div style={{ border: `2px solid ${GREEN}`, borderRadius: 6, background: "#fff", display: "flex", flexDirection: "column", minHeight: state === 4 ? 340 : 480 }}>
            {/* Panel header */}
            <div style={{ padding: "9px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Generative AI Query</span>
              {state >= 2 && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13 }}>&raquo;</button>}
            </div>

            {/* STATE 1 & 2: Welcome state */}
            {(state === 1 || state === 2) && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 20px 0", background: "#fafafa", gap: 6 }}>
                <SpeechBubble text="Good morning! Start by typing your question or selecting a query from the list." />
                <div style={{ marginTop: 4 }}><RobotMascot /></div>
                <div style={{ width: "100%", marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Suggested Queries</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {SUGGESTED_PILLS.map(q => (
                      <QueryPill key={q} label={q} onClick={() => sendQuery(q)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STATE 3 & 4: Chat view */}
            {(state === 3 || state === 4) && (
              <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, background: "#fafafa" }}>
                {/* User message */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                  <div style={{ background: "#e8e8e8", borderRadius: 16, padding: "7px 14px", fontSize: 13, color: "#333", maxWidth: "75%" }}>
                    {messages.length > 0 ? messages[messages.length - 1].text : "What are the top reasons for churn?"}
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#546e7a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                  </div>
                </div>

                {/* Bot response */}
                <BotResponseCard onRowClick={() => setState(4)} />

                {/* Follow-up suggested queries */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, paddingLeft: 34 }}>Suggested Follow-Up Queries</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 34 }}>
                    {FOLLOW_UP_PILLS.map(q => (
                      <QueryPill key={q} label={q} onClick={() => sendQuery(q)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pinned input bar */}
            <InputBar onSubmit={sendQuery} />
          </div>

          {/* Waveform player — state 4 */}
          {state === 4 && <WaveformPlayer onClose={() => setState(3)} />}
        </div>

        {/* Right panel */}
        <RightPanel />
      </div>
    </div>
  );
}
