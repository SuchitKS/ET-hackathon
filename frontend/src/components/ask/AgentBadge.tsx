import type { AgentName } from "@/types";
import Tag from "@/components/ui/Tag";

const AGENT_META: Record<AgentName, { label: string; tone: "amber" | "teal" | "rust" | "plum" }> = {
  retrieval: { label: "Retrieval agent", tone: "teal" },
  rca: { label: "RCA agent", tone: "amber" },
  compliance: { label: "Compliance agent", tone: "rust" },
  workorder: { label: "Work order agent", tone: "plum" },
};

export function agentTone(agent?: AgentName) {
  return agent ? AGENT_META[agent].tone : "neutral";
}

export default function AgentBadge({ agent, latencyMs }: { agent: AgentName; latencyMs?: number }) {
  const meta = AGENT_META[agent];
  return (
    <div className="flex items-center gap-2">
      <Tag tone={meta.tone}>{meta.label}</Tag>
      {latencyMs != null && <span className="font-mono text-[11px] text-faint">{(latencyMs / 1000).toFixed(1)}s</span>}
    </div>
  );
}
