import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, Search, Wrench, ShieldCheck, FileOutput, Loader2, Check } from "lucide-react";
import type { AgentName } from "@/types";

type Stage = "classifying" | "working" | "done";

const AGENTS: Record<AgentName, { label: string; icon: typeof Search; accent: string; steps: string[] }> = {
  retrieval: {
    label: "Retrieval agent",
    icon: Search,
    accent: "#2B6B54",
    steps: ["Embedding the question…", "Searching the knowledge graph…", "Ranking matching sources…"],
  },
  rca: {
    label: "RCA agent",
    icon: Wrench,
    accent: "#B5651D",
    steps: ["Traversing failure history…", "Cross-referencing procedures…", "Computing downtime impact…"],
  },
  compliance: {
    label: "Compliance agent",
    icon: ShieldCheck,
    accent: "#A13F28",
    steps: ["Loading the regulation checklist…", "Comparing against the procedure…", "Flagging gaps…"],
  },
  workorder: {
    label: "Work order agent",
    icon: FileOutput,
    accent: "#7C5285",
    steps: ["Drafting the recommended action…", "Linking source documents…", "Formatting the work order…"],
  },
};

const ORDER: AgentName[] = ["retrieval", "rca", "compliance", "workorder"];

export default function AgentPipeline({
  agent,
  mode,
  traceSummary,
  onComplete,
}: {
  agent: AgentName;
  mode: "live" | "static";
  traceSummary?: string;
  onComplete?: () => void;
}) {
  const [stage, setStage] = useState<Stage>(mode === "static" ? "done" : "classifying");
  const [stepIndex, setStepIndex] = useState(0);
  const active = AGENTS[agent];
  const others = ORDER.filter((a) => a !== agent);

  useEffect(() => {
    if (mode !== "live") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage("working"), 500));
    active.steps.forEach((_, i) => {
      timers.push(setTimeout(() => setStepIndex(i), 500 + i * 480));
    });
    timers.push(
      setTimeout(() => {
        setStage("done");
        onComplete?.();
      }, 500 + active.steps.length * 480 + 250)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, agent]);

  const Icon = active.icon;

  return (
    <div className="rounded-xl border border-line bg-surface2/60 p-4">
      <div className="flex items-center gap-2.5">
        <motion.span
          animate={stage === "classifying" ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.8, repeat: stage === "classifying" ? Infinity : 0 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <GitFork size={14} className="text-ink" />
        </motion.span>
        <div>
          <div className="text-[12.5px] font-medium text-ink">Supervisor</div>
          <div className="text-[11px] text-faint">
            {stage === "classifying" ? "Classifying intent…" : `Routed to ${active.label.toLowerCase()}`}
          </div>
        </div>
      </div>

      <div className="ml-4 h-4 w-px" style={{ backgroundColor: stage === "classifying" ? "#E6DECB" : active.accent }} />

      <div
        className="rounded-lg border p-3.5"
        style={{
          borderColor: stage === "classifying" ? "#E6DECB" : `${active.accent}40`,
          backgroundColor: stage === "classifying" ? "transparent" : `${active.accent}0C`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: stage === "classifying" ? "#E6DECB" : active.accent,
              backgroundColor: stage === "classifying" ? "transparent" : `${active.accent}18`,
            }}
          >
            {stage === "working" ? (
              <Loader2 size={13} className="animate-spin" color={active.accent} />
            ) : stage === "done" ? (
              <Check size={13} color={active.accent} />
            ) : (
              <Icon size={13} className="text-faint" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-ink">{active.label}</div>
            <AnimatePresence mode="wait">
              {stage === "working" && (
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.18 }}
                  className="text-[11.5px] text-soft"
                >
                  {active.steps[stepIndex]}
                </motion.div>
              )}
              {stage === "done" && traceSummary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-[11.5px] leading-snug text-soft"
                >
                  {traceSummary}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 pl-1">
        <span className="text-[10.5px] text-faint">Not routed:</span>
        {others.map((key) => {
          const meta = AGENTS[key];
          const OIcon = meta.icon;
          return (
            <span key={key} className="flex items-center gap-1 text-[10.5px] text-faint">
              <OIcon size={11} />
              {meta.label.replace(" agent", "")}
            </span>
          );
        })}
      </div>
    </div>
  );
}
