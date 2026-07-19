import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkOrder } from "@/types";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

export default function WorkOrderModal({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface shadow-lift"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line bg-surface2 px-5 py-3.5">
            <div>
              <span className="text-[12.5px] text-soft">Work order draft</span>
              <div className="mt-0.5 font-mono text-[13px] text-ink">{order.id}</div>
            </div>
            <button onClick={onClose} className="rounded p-1 text-soft hover:bg-surface hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="mb-1.5 text-[12px] text-soft">Asset</div>
              <div className="text-[13.5px] font-medium text-ink">{order.asset}</div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-soft">Title</div>
              <div className="font-display text-[16px] leading-snug text-ink">{order.title}</div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-soft">Root cause</div>
              <div className="text-[13px] leading-relaxed text-soft">{order.rootCause}</div>
            </div>

            <div>
              <div className="mb-1.5 text-[12px] text-soft">Recommended action</div>
              <div className="text-[13px] leading-relaxed text-soft">{order.recommendedAction}</div>
            </div>

            <div className="rounded-lg border border-amber/20 bg-amber/[0.06] px-4 py-3">
              <div className="font-display text-[24px] font-semibold leading-none text-ink">
                {order.downtimeAvoidedHrs} <span className="font-sans text-[13px] font-normal text-soft">hrs downtime avoided</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[12px] text-soft">Linked documents</div>
              <div className="flex flex-wrap gap-1.5">
                {order.linkedDocs.map((d) => (
                  <Tag key={d} mono>
                    {d}
                  </Tag>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-[12px] text-soft">Generated {order.generatedAt}</span>
              <Button variant="ghost">
                <Download size={13} /> Export PDF
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
