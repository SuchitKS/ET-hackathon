import { useEffect, useRef } from "react";
import type { ChatMessage, AgentName } from "@/types";
import ChatMessageItem from "./ChatMessageItem";
import AgentPipeline from "./AgentPipeline";

export default function ChatThread({
  messages,
  pendingAgent,
  liveAnsweredIds,
}: {
  messages: ChatMessage[];
  pendingAgent: AgentName | null;
  liveAnsweredIds: Set<string>;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingAgent]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {messages.length === 0 && !pendingAgent && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="font-display text-[20px] text-ink">Ask a question</span>
            <span className="mt-1.5 max-w-xs text-[13px] text-soft">
              Queries are routed automatically to the right specialist agent.
            </span>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessageItem key={m.id} message={m} initiallyExpanded={liveAnsweredIds.has(m.id)} />
        ))}
        {pendingAgent && (
          <div className="card border-l-2 border-l-amber/40 p-4">
            <div className="mb-3 text-[12px] font-medium text-soft">Routing your question…</div>
            <AgentPipeline agent={pendingAgent} mode="live" />
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
