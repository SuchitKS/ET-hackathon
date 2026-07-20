import { useState } from "react";
import { ChevronDown, AlertTriangle, ArrowRight } from "lucide-react";
import type { ChatMessage } from "@/types";
import CitationTag from "./CitationTag";
import FindingCard from "./FindingCard";
import AgentPipeline from "./AgentPipeline";
import ReactMarkdown from "react-markdown";
import { formatTimestamp } from "@/lib/utils";

export default function ChatMessageItem({
  message,
  initiallyExpanded = false,
  onFollowUp,
  onShowEvidence,
}: {
  message: ChatMessage;
  initiallyExpanded?: boolean;
  onFollowUp?: (parentId: string, text: string) => void;
  onShowEvidence?: (id: string) => void;
}) {
  const [showTrace, setShowTrace] = useState(initiallyExpanded);
  const [followUpInput, setFollowUpInput] = useState("");

  // User message — minimal right-aligned
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4 pr-2">
        <div className="max-w-[85%] text-[15px] leading-relaxed text-ink/90 font-medium tracking-tight">
          {message.text}
        </div>
      </div>
    );
  }

  // Error message
  if (message.isError) {
    return (
      <div className="investigation-card border-l-2 border-l-failure p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-failure" strokeWidth={2.5} />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-failure mb-1">Request Failed</div>
            <div className="text-[13.5px] leading-relaxed text-soft">{message.text}</div>
          </div>
        </div>
      </div>
    );
  }

  // Investigation Card — the main response format
  return (
    <div className="investigation-card mb-8 animate-fade-in flex flex-col overflow-hidden bg-surface border border-line rounded-xl shadow-soft">
      {/* Header — Trace Summary */}
      {message.agent && (
        <div className="border-b border-line/50">
          <AgentPipeline agent={message.agent} mode="static" traceSummary={message.traceSummary} />
        </div>
      )}

      {/* Answer Content */}
      <div className="px-8 py-8">
        <div className="prose-strata">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      </div>

      {/* Citations & Evidence Links */}
      {(message.citations?.length || message.finding) && (
        <div className="border-t border-line/50 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface2/10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold tracking-wider text-faint uppercase mr-1">Sources</span>
            {message.citations?.map((c) => (
              <CitationTag key={c.id} citation={c} />
            ))}
          </div>
          <div className="flex items-center shrink-0">
            {onShowEvidence && (
              <button
                onClick={() => onShowEvidence(message.id)}
                className="text-[11.5px] font-medium text-ink hover:text-ink/70 transition-colors underline decoration-line/40 underline-offset-4"
              >
                Inspect Evidence
              </button>
            )}
          </div>
        </div>
      )}

      {/* Structured Finding (if available) */}
      {message.finding && (
        <div className="border-t border-line/50 px-8 py-6 bg-surface2/5">
          <FindingCard finding={message.finding} />
        </div>
      )}

      {/* Threaded Follow-ups */}
      {message.followUps && message.followUps.length > 0 && (
        <div className="border-t border-line/50 bg-background/30">
          <div className="ml-8 border-l border-line/30 pl-6 py-6 space-y-8">
            {message.followUps.map((fu) => (
              <ChatMessageItem key={fu.id} message={fu} onFollowUp={onFollowUp} onShowEvidence={onShowEvidence} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
