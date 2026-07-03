import { createContext, useContext, useState } from "react";

interface ChatContextValue {
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <ChatContext.Provider
      value={{ chatOpen, openChat: () => setChatOpen(true), closeChat: () => setChatOpen(false) }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
