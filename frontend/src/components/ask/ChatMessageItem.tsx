import { useState } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import type { ChatMessage } from "@/types";
import { agentTone } from "./AgentBadge";
import CitationTag from "./CitationTag";
import FindingCard from "./FindingCard";
import AgentPipeline from "./AgentPipeline";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { formatTimestamp } from "@/lib/utils";

const BORDER_TONE: Record<string, string> = {
  amber: "border-l-amber",
  teal: "border-l-teal",
  rust: "border-l-rust",
  plum: "border-l-plum",
  neutral: "border-l-line",
};

export default function ChatMessageItem({
  message,
  initiallyExpanded = false,
}: {
  message: ChatMessage;
  initiallyExpanded?: boolean;
}) {
  const [showRouting, setShowRouting] = useState(initiallyExpanded);

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] rounded-xl rounded-tr-sm border border-line bg-surface px-4 py-2.5 text-[13.5px] leading-snug text-ink shadow-soft">
          {message.text}
        </div>
      </motion.div>
    );
  }

  if (message.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card flex items-start gap-2.5 border-l-2 border-l-rust bg-rust/5 p-4"
      >
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rust" />
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-rust">Request failed</div>
          <div className="mt-0.5 text-[13px] leading-snug text-ink/80">{message.text}</div>
        </div>
      </motion.div>
    );
  }

  const tone = agentTone(message.agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`card border-l-2 ${BORDER_TONE[tone]} p-4`}
    >
      <div className="mb-3 flex items-center justify-between">
        {message.agent && (
          <button
            onClick={() => setShowRouting((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-soft hover:text-ink"
          >
            <ChevronDown size={13} className={`transition-transform ${showRouting ? "rotate-180" : ""}`} />
            View agent routing
          </button>
        )}
        <span className="text-[11.5px] text-faint">{formatTimestamp(message.timestamp)}</span>
      </div>

      {showRouting && message.agent && (
        <div className="mb-4">
          <AgentPipeline agent={message.agent} mode="static" traceSummary={message.traceSummary} />
        </div>
      )}

      <div className="prose-strata">
        <ReactMarkdown>{message.text}</ReactMarkdown>
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-soft">Sources</span>
          {message.citations.map((c) => (
            <CitationTag key={c.id} citation={c} />
          ))}
        </div>
      )}

      {message.finding && <FindingCard finding={message.finding} />}
    </motion.div>
  );
}
