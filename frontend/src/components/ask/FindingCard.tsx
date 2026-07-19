import { FileOutput, Loader2, Check } from "lucide-react";
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
    <div className="rounded-md border border-line bg-surface2/30">
      <div className="flex items-center gap-5 p-4">
        <div>
          <div className="font-sans text-[24px] font-semibold tracking-tight text-ink">{finding.metricValue}</div>
          <div className="text-caption text-faint mt-0.5">{finding.metricLabel.toUpperCase()}</div>
        </div>
        <div className="h-8 w-[1px] bg-line" />
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-ink">{finding.headline}</div>
          <div className="mt-0.5 text-[11.5px] text-faint">{finding.detail}</div>
        </div>
        <Button onClick={handleGenerate} disabled={status !== "idle"}>
          {status === "idle" && <><FileOutput size={11} strokeWidth={2.5} /> Generate WO</>}
          {status === "loading" && <><Loader2 size={11} className="animate-spin" strokeWidth={2.5} /> Working</>}
          {status === "done" && <><Check size={11} strokeWidth={2.5} /> View WO</>}
        </Button>
      </div>

      {showModal && order && <WorkOrderModal order={order} onClose={() => setShowModal(false)} />}
      {status === "done" && !showModal && (
        <button
          onClick={() => setShowModal(true)}
          className="block w-full border-t border-line px-4 py-2 text-left text-caption text-faint transition-colors duration-150 hover:bg-surface3/50 hover:text-ink"
        >
          REOPEN {order?.id}
        </button>
      )}
    </div>
  );
}
