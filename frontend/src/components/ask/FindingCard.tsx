import { FileOutput, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { Finding } from "@/types";
import Button from "@/components/ui/Button";
import { generateWorkOrder } from "@/lib/api";
import WorkOrderModal from "@/components/workorder/WorkOrderModal";
import type { WorkOrder } from "@/types";

export default function FindingCard({ finding }: { finding: Finding }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleGenerate() {
    setStatus("loading");
    const wo = await generateWorkOrder(finding.headline);
    setOrder(wo);
    setStatus("done");
    setShowModal(true);
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-amber/20 bg-amber/[0.05]">
      <div className="border-b border-amber/15 px-4 py-2.5">
        <span className="text-[12.5px] font-medium text-amber">Finding</span>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div>
            <div className="font-display text-[32px] font-semibold leading-none text-ink">{finding.metricValue}</div>
            <div className="mt-1.5 text-[11.5px] text-soft">{finding.metricLabel}</div>
          </div>
          <div className="max-w-sm text-[13px] leading-snug text-ink/85">
            <div className="font-medium">{finding.headline}</div>
            <div className="mt-1 text-soft">{finding.detail}</div>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={status !== "idle"} className="shrink-0">
          {status === "idle" && (
            <>
              <FileOutput size={14} /> Generate work order
            </>
          )}
          {status === "loading" && (
            <>
              <Loader2 size={14} className="animate-spin" /> Generating
            </>
          )}
          {status === "done" && (
            <>
              <CheckCircle2 size={14} /> View work order
            </>
          )}
        </Button>
      </div>

      {showModal && order && <WorkOrderModal order={order} onClose={() => setShowModal(false)} />}
      {status === "done" && !showModal && (
        <button
          onClick={() => setShowModal(true)}
          className="block w-full border-t border-amber/15 px-4 py-2 text-left text-[12px] font-medium text-amber hover:bg-amber/5"
        >
          Reopen {order?.id}
        </button>
      )}
    </div>
  );
}
