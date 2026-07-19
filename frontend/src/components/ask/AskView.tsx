import { useEffect, useState } from "react";
import type { AgentName, ChatMessage } from "@/types";
import { fetchChatHistory, sendQuestionStream } from "@/lib/api";
import { predictAgent } from "@/lib/utils";
import ChatThread from "./ChatThread";
import ChatInput from "./ChatInput";
import AlertBanner from "@/components/layout/AlertBanner";

export default function AskView({ onTrackedAsset }: { onTrackedAsset?: (asset: string | null) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAgent, setPendingAgent] = useState<AgentName | null>(null);
  const [liveAnsweredIds, setLiveAnsweredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchChatHistory().then(setMessages);
  }, []);

  async function handleSend(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setPendingAgent(predictAgent(text));

    let replyMeta: any = null;
    let replyText = "";
    
    try {
      for await (const chunk of sendQuestionStream(text)) {
        if (chunk.meta) {
          replyMeta = chunk.meta;
          setPendingAgent(null);
          setMessages((prev) => [...prev, { ...replyMeta, text: "" }]);
          if (onTrackedAsset) {
            onTrackedAsset(chunk.meta.trackedAsset || null);
          }
        }
        if (chunk.text) {
          replyText += chunk.text;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last.id === replyMeta?.id) {
              return [...prev.slice(0, -1), { ...last, text: replyText }];
            }
            return prev;
          });
        }
      }
      if (replyMeta) {
        setLiveAnsweredIds((prev) => new Set(prev).add(replyMeta.id));
      }
    } catch (e) {
      setPendingAgent(null);
      console.error(e);
      // Previously this just cleared the pending state and logged to the
      // console — the "Routing your question…" card would vanish with
      // nothing replacing it, which looked like the request had silently
      // done nothing. Show what actually happened instead.
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: e instanceof Error ? e.message : "Something went wrong reaching the backend.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <AlertBanner />
      <ChatThread messages={messages} pendingAgent={pendingAgent} liveAnsweredIds={liveAnsweredIds} />
      <ChatInput onSend={handleSend} disabled={pendingAgent !== null} />
    </div>
  );
}
