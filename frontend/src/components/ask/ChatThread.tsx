import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types";
import ChatMessageItem from "./ChatMessageItem";

export default function ChatThread({
  messages,
  liveAnsweredIds,
  onFollowUp,
  onShowEvidence,
}: {
  messages: ChatMessage[];
  liveAnsweredIds: Set<string>;
  onFollowUp: (parentId: string, text: string) => void;
  onShowEvidence: (id: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-80">
            <div className="text-[14px] font-medium text-ink">Industrial Intelligence OS</div>
            <div className="mt-2 max-w-[320px] text-[12.5px] leading-relaxed text-faint">
              Investigate assets, analyze failures, and validate compliance across the enterprise knowledge graph.
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessageItem
            key={m.id}
            message={m}
            initiallyExpanded={liveAnsweredIds.has(m.id)}
            onFollowUp={onFollowUp}
            onShowEvidence={onShowEvidence}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
