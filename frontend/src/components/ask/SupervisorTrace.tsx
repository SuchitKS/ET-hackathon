import { useEffect, useState } from "react";
import { BrainCircuit, Check, GitMerge } from "lucide-react";
import type { AgentName } from "@/types";

export default function SupervisorTrace({ agent }: { agent: AgentName | null }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!agent) {
      setStage(0);
      return;
    }
    
    setStage(1); // Analyzing intent
    const t1 = setTimeout(() => setStage(2), 600); // Intent identified
    const t2 = setTimeout(() => setStage(3), 1200); // Routing to agent

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [agent]);

  if (!agent) return null;

  return (
    <div className="absolute right-6 top-6 z-50 flex w-72 flex-col gap-3 rounded-lg border border-line bg-surface/80 p-4 shadow-lift backdrop-blur-md animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <BrainCircuit size={16} className="text-ink" />
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-ink">
          Supervisor Agent
        </span>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        {/* Stage 1 */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20">
            <Check size={10} className="text-success" />
          </div>
          <span className="text-[13px] text-faint">Intercepting query...</span>
        </div>

        {/* Stage 2 */}
        {stage >= 2 ? (
          <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20">
              <Check size={10} className="text-success" />
            </div>
            <span className="text-[13px] text-faint">Analyzing intent & matching semantics</span>
          </div>
        ) : (
          <div className="flex items-start gap-3 opacity-50">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line" />
            <span className="text-[13px] text-faint">Analyzing intent...</span>
          </div>
        )}

        {/* Stage 3 */}
        {stage >= 3 ? (
          <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20">
              <GitMerge size={10} className="text-success" />
            </div>
            <span className="text-[13px] font-medium text-ink">
              Routing to <span className="uppercase text-success">{agent} Agent</span>
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-3 opacity-50">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line" />
            <span className="text-[13px] text-faint">Routing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
