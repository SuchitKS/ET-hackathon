import { useEffect, useState } from "react";
import { GitFork, Search, Wrench, ShieldCheck, FileOutput, Loader2, Check, Database, Network, History, Sparkles, ShieldQuestion } from "lucide-react";
import type { AgentName } from "@/types";

type StageStatus = "pending" | "active" | "done";

interface PipelineStage {
  id: string;
  label: string;
  icon: typeof Search;
  liveTexts: string[];
}

const COMMON_STAGES: PipelineStage[] = [
  { id: "intent", label: "Intent Detection", icon: GitFork, liveTexts: ["Classifying query intent…", "Identifying target assets…"] },
  { id: "retrieval", label: "Knowledge Retrieval", icon: Search, liveTexts: ["Embedding question…", "Searching document corpus…", "Ranking results…"] },
  { id: "graph", label: "Graph Traversal", icon: Network, liveTexts: ["Querying knowledge graph…", "Tracing relationships…"] },
  { id: "history", label: "Historical Search", icon: History, liveTexts: ["Searching historical incidents…", "Finding similar failures…"] },
];

const AGENT_STAGES: Record<AgentName, PipelineStage[]> = {
  retrieval: [
    ...COMMON_STAGES,
    { id: "synthesis", label: "Synthesis", icon: Sparkles, liveTexts: ["Synthesizing findings…", "Computing confidence…"] },
    { id: "validate", label: "Validation", icon: ShieldQuestion, liveTexts: ["Validating sources…"] },
    { id: "generate", label: "Response Generation", icon: Database, liveTexts: ["Generating explanation…", "Formatting response…"] },
  ],
  rca: [
    ...COMMON_STAGES,
    { id: "rca", label: "Root Cause Analysis", icon: Wrench, liveTexts: ["Building failure timeline…", "Cross-referencing procedures…", "Computing downtime impact…"] },
    { id: "validate", label: "Validation", icon: ShieldQuestion, liveTexts: ["Validating analysis…"] },
    { id: "generate", label: "Response Generation", icon: Database, liveTexts: ["Generating explanation…", "Formatting response…"] },
  ],
  compliance: [
    ...COMMON_STAGES,
    { id: "compliance", label: "Compliance Validation", icon: ShieldCheck, liveTexts: ["Loading regulation checklist…", "Comparing against procedures…", "Flagging gaps…"] },
    { id: "validate", label: "Validation", icon: ShieldQuestion, liveTexts: ["Validating findings…"] },
    { id: "generate", label: "Response Generation", icon: Database, liveTexts: ["Generating explanation…", "Formatting response…"] },
  ],
  workorder: [
    ...COMMON_STAGES,
    { id: "workorder", label: "Work Order Draft", icon: FileOutput, liveTexts: ["Drafting recommended action…", "Linking source documents…", "Formatting work order…"] },
    { id: "validate", label: "Validation", icon: ShieldQuestion, liveTexts: ["Validating work order…"] },
    { id: "generate", label: "Response Generation", icon: Database, liveTexts: ["Generating explanation…", "Formatting response…"] },
  ],
  architecture: [
    ...COMMON_STAGES,
    { id: "architecture", label: "Topology Analysis", icon: Network, liveTexts: ["Analyzing P&ID structure…", "Tracing flow path…", "Checking upstream/downstream…"] },
    { id: "validate", label: "Validation", icon: ShieldQuestion, liveTexts: ["Validating connections…"] },
    { id: "generate", label: "Response Generation", icon: Database, liveTexts: ["Generating explanation…", "Formatting response…"] },
  ],
};

export default function AgentPipeline({
  agent,
  mode,
  traceSummary,
}: {
  agent: AgentName;
  mode: "live" | "static";
  traceSummary?: string;
}) {
  const stages = AGENT_STAGES[agent];
  const [currentStage, setCurrentStage] = useState(mode === "static" ? stages.length : 0);
  const [liveTextIndex, setLiveTextIndex] = useState(0);

  useEffect(() => {
    if (mode !== "live") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stageIdx = 0;
    let delay = 300;

    function advanceStage() {
      if (stageIdx >= stages.length) return;
      setCurrentStage(stageIdx + 1);
      const stage = stages[stageIdx];

      stage.liveTexts.forEach((_, tIdx) => {
        timers.push(setTimeout(() => setLiveTextIndex(tIdx), delay + tIdx * 400));
      });

      delay += stage.liveTexts.length * 400 + 200;
      stageIdx++;
      timers.push(setTimeout(advanceStage, delay - 200));
    }

    timers.push(setTimeout(advanceStage, 300));
    return () => timers.forEach(clearTimeout);
  }, [mode, agent]);

  // Collapsed Static View — Prominent trace header
  if (mode === "static") {
    return (
      <div className="flex items-center gap-3 rounded-t-xl bg-surface2/60 px-5 py-3 border-b border-line">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 border border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.1)]">
          <Check size={11} className="text-success" strokeWidth={3} />
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold tracking-wide uppercase text-ink">
            {agent} Agent
          </span>
          <span className="text-[11px] text-faint">
            {stages.length} Stages Completed {traceSummary ? `• ${traceSummary}` : ""}
          </span>
        </div>
      </div>
    );
  }

  // Live Mode — Floating Center Overlay
  return (
    <div className="glass flex w-full max-w-[340px] flex-col rounded-2xl p-6 shadow-lift animate-fade-in">
      <div className="mb-6 flex items-center gap-3 border-b border-line pb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-ink">
          <Loader2 size={13} className="animate-spin" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-ink">Orchestrating Agents</div>
          <div className="text-[11px] text-faint mt-0.5">Routing to {agent.toUpperCase()} specialist…</div>
        </div>
      </div>

      <div className="space-y-0 pl-1">
        {stages.map((stage, idx) => {
          const status: StageStatus = idx < currentStage ? "done" : idx === currentStage ? "active" : "pending";
          const Icon = stage.icon;
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  status === "done" ? "bg-success/20 shadow-[0_0_8px_rgba(34,197,94,0.2)]" :
                  status === "active" ? "bg-ink/15 scale-110 shadow-[0_0_12px_rgba(255,255,255,0.1)]" :
                  "bg-surface3"
                }`}>
                  {status === "done" ? (
                    <Check size={11} className="text-success" strokeWidth={3} />
                  ) : status === "active" ? (
                    <Icon size={11} className="text-ink animate-pulse" strokeWidth={2} />
                  ) : (
                    <Icon size={10} className="text-faint/50" strokeWidth={2} />
                  )}
                </div>
                {!isLast && (
                  <div className="relative w-[1.5px] flex-1 min-h-[22px] bg-line overflow-hidden my-0.5">
                    {/* Animated connecting line effect */}
                    {status === "active" && (
                      <div className="absolute left-0 top-0 w-full h-full animate-[slideDown_1s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-ink/40 to-transparent" />
                    )}
                    {status === "done" && (
                      <div className="absolute left-0 top-0 w-full h-full bg-success/30" />
                    )}
                  </div>
                )}
              </div>

              <div className={`pb-4 pt-0.5 transition-all duration-300 ${status === "pending" ? "opacity-20 translate-x-1" : "opacity-100 translate-x-0"}`}>
                <div className={`text-[13px] font-medium ${
                  status === "active" ? "text-ink" : status === "done" ? "text-soft" : "text-faint"
                }`}>
                  {stage.label}
                </div>
                {status === "active" && (
                  <div className="mt-1 text-[11.5px] text-faint animate-fade-in">
                    {stage.liveTexts[Math.min(liveTextIndex, stage.liveTexts.length - 1)]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
