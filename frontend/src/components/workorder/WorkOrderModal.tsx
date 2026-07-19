import { X, Download } from "lucide-react";
import type { WorkOrder } from "@/types";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

function handleExportPdf(order: WorkOrder) {
  if (order.pdfUrl) {
    const url = order.pdfUrl.startsWith("http")
      ? order.pdfUrl
      : `http://localhost:8000${order.pdfUrl}`;
    window.open(url, "_blank");
  } else {
    window.print();
  }
}

export default function WorkOrderModal({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(12,12,14,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-surface shadow-lift animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <div className="text-caption text-faint">WORK ORDER</div>
            <div className="mt-0.5 font-mono text-[12px] text-ink">{order.id}</div>
          </div>
          <button onClick={onClose} className="rounded-[4px] p-1.5 text-faint transition-colors duration-150 hover:bg-ink/[0.06] hover:text-ink">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5">
          <div>
            <div className="text-caption text-faint mb-1">ASSET</div>
            <div className="text-[13px] font-medium text-ink">{order.asset}</div>
          </div>

          <div>
            <div className="text-caption text-faint mb-1">TITLE</div>
            <div className="text-[15px] font-semibold tracking-tight text-ink">{order.title}</div>
          </div>

          <div>
            <div className="text-caption text-faint mb-1">ROOT CAUSE</div>
            <div className="text-body text-soft">{order.rootCause}</div>
          </div>

          <div>
            <div className="text-caption text-faint mb-1">RECOMMENDED ACTION</div>
            <div className="text-body text-soft">{order.recommendedAction}</div>
          </div>

          {/* Metric */}
          <div className="rounded-md border border-line bg-surface2/30 px-4 py-3">
            <div className="text-[22px] font-semibold tracking-tight text-ink">
              {order.downtimeAvoidedHrs} <span className="text-[11px] font-normal text-faint">hrs downtime avoided</span>
            </div>
          </div>

          {/* Linked docs */}
          <div>
            <div className="text-caption text-faint mb-2">LINKED DOCUMENTS</div>
            <div className="flex flex-wrap gap-1.5">
              {order.linkedDocs.map((d) => (
                <Tag key={d} mono>{d}</Tag>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-[11px] text-faint">{order.generatedAt}</span>
            <Button variant="ghost" onClick={() => handleExportPdf(order)}>
              <Download size={11} strokeWidth={2.5} /> Export PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
