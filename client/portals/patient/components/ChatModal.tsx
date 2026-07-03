import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { MANUFACTURER, CHATBOT_ICON } from "@/config/branding";

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "bot",
    text: "Hello Alex! Thank you for contacting CoAssist. I'm your virtual assistant, here to help.",
  },
  {
    id: 2,
    role: "bot",
    text: "How may I help you today?",
  },
];

const SCRIPTED_REPLIES = [
  "Thanks, Alex... I've got your information — let me check your current status for you.",
  "Your prescription is currently waiting on a decision from your insurance. The prior authorization was submitted 2 days ago and is under review. You don't need to take any action right now. If you have any other questions or need more details, just let me know.",
];

interface ChatModalProps {
  onClose: () => void;
}

export default function ChatModal({ onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [scriptIndex, setScriptIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function sendMessage() {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const repliesToSend = SCRIPTED_REPLIES.slice(scriptIndex);
    setScriptIndex(SCRIPTED_REPLIES.length);

    repliesToSend.forEach((reply, i) => {
      setTimeout(() => {
        if (i === repliesToSend.length - 1) setIsTyping(false);
        setMessages((prev) => [...prev, { id: Date.now() + i, role: "bot", text: reply }]);
        if (i < repliesToSend.length - 1) setIsTyping(true);
      }, 1500 + i * 2000);
    });

    if (repliesToSend.length === 0) {
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: "bot", text: "Is there anything else I can help you with?" },
        ]);
      }, 1500);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "rgba(65,64,66,0.5)" }}
      onClick={onClose}
    >
      {/* Single teal container */}
      <div
        className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl overflow-hidden flex flex-col shadow-2xl bg-arx-primary"
        style={{ height: "85vh", maxHeight: "680px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20">
              <img src={CHATBOT_ICON} alt="" className="w-6 h-6 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white">{MANUFACTURER.support.label}</span>
              <span className="text-[10px] text-white/70">{MANUFACTURER.name} Virtual Assistant</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close chat" className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-white/10">
          {messages.map((msg) =>
            msg.role === "bot" ? (
              <BotMessage key={msg.id} text={msg.text} />
            ) : (
              <UserMessage key={msg.id} text={msg.text} />
            )
          )}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div className="flex-shrink-0 px-4 pb-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2 bg-white border border-white">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type in here"
                className="flex-1 text-sm bg-transparent outline-none text-arx-slate placeholder:text-arx-inactive"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity bg-arx-primary hover:bg-arx-primary-dark disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          <p className="text-[10px] mt-2 leading-relaxed text-white/60">
            This is an AI-powered assistant. It is not a substitute for professional medical
            advice, diagnosis, or treatment. All information is for educational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}

function BotMessage({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-white text-arx-slate">
        {text}
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed bg-white text-arx-primary font-medium">
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
      </div>
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center bg-white">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-bounce bg-arx-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
