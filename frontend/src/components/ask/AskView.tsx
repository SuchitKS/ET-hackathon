import { useEffect, useState, useCallback } from "react";
import type { AgentName, ChatMessage, Conversation } from "@/types";
import { fetchChatHistory, sendQuestionStream, fetchConversations, createNewSession, getSessionId, getOperator } from "@/lib/api";
import { predictAgent } from "@/lib/utils";
import ChatThread from "./ChatThread";
import ChatInput from "./ChatInput";
import AlertBanner from "@/components/layout/AlertBanner";
import AgentPipeline from "./AgentPipeline";
import EvidencePanel from "./EvidencePanel";
import SupervisorTrace from "./SupervisorTrace";
import ConversationSidebar from "./ConversationSidebar";
import { AnimatePresence } from "framer-motion";

export default function AskView({ onTrackedAsset }: { onTrackedAsset?: (asset: string | null) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAgent, setPendingAgent] = useState<AgentName | null>(null);
  const [liveAnsweredIds, setLiveAnsweredIds] = useState<Set<string>>(new Set());
  const [evidenceMessageId, setEvidenceMessageId] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string>(getSessionId());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [operator, setOperatorState] = useState<string>(getOperator() || "R. Sharma");

  // Fetch history for the active session
  useEffect(() => {
    setMessages([]);
    fetchChatHistory(activeSessionId).then(setMessages);
  }, [activeSessionId]);

  // Fetch conversations when operator changes or a new message is sent
  const loadConversations = useCallback(() => {
    fetchConversations(operator).then(setConversations).catch(console.error);
  }, [operator]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewSession = () => {
    setActiveSessionId(createNewSession());
  };

  const handleOperatorChange = (op: string) => {
    setOperatorState(op);
  };

  async function handleSend(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setPendingAgent(predictAgent(text));

    // Reload conversations sidebar so the new title appears
    setTimeout(loadConversations, 1000);

    let replyMeta: any = null;
    let replyText = "";
    
    try {
      for await (const chunk of sendQuestionStream(text, activeSessionId, operator)) {
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

  function handleFollowUp(parentId: string, text: string) {
    const followUpMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      parentId,
    };
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === parentId) {
          return { ...m, followUps: [...(m.followUps ?? []), followUpMsg] };
        }
        return m;
      })
    );
    handleSend(text);
  }

  const evidenceMsg = messages.find((m) => m.id === evidenceMessageId) || null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeSessionId}
        onSelect={setActiveSessionId}
        onNew={handleNewSession}
        onOperatorChange={handleOperatorChange}
      />
      
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        <SupervisorTrace agent={pendingAgent} />
        
        <div className="w-full shrink-0">
          <AlertBanner />
        </div>
        
        {/* Scrollable Conversation Area */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col pb-8 pt-8">
            <ChatThread
              messages={messages}
              liveAnsweredIds={liveAnsweredIds}
              onFollowUp={handleFollowUp}
              onShowEvidence={(id) => setEvidenceMessageId(id)}
            />
          </div>
        </div>

        {/* Fixed Bottom Input (Normal Document Flow) */}
        <div className="w-full shrink-0 border-t border-line/50 bg-background/95 backdrop-blur-md pb-6 pt-4">
          <div className="mx-auto w-full max-w-3xl px-4">
            <ChatInput onSend={handleSend} disabled={pendingAgent !== null} />
          </div>
        </div>

        {/* Floating Orchestration Overlay */}
        <AnimatePresence>
          {pendingAgent && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-paper/40 backdrop-blur-[2px]">
              <AgentPipeline agent={pendingAgent} mode="live" />
            </div>
          )}
        </AnimatePresence>

        {/* Slide-out Evidence Modal */}
        <AnimatePresence>
          {evidenceMessageId && evidenceMsg && (
            <EvidencePanel message={evidenceMsg} onClose={() => setEvidenceMessageId(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
