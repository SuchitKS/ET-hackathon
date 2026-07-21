import { Plus, MessageSquare } from "lucide-react";
import type { Conversation } from "@/types";
import OperatorPicker from "@/components/layout/OperatorPicker";

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onOperatorChange,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onOperatorChange: (op: string) => void;
}) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-line/50 bg-surface2/30">
      {/* Header / New Button */}
      <div className="p-4">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-semibold text-paper transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Investigation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="mb-2 px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Investigations
        </div>
        <div className="space-y-0.5">
          {conversations.length === 0 ? (
            <div className="px-2 py-4 text-center text-[12px] text-faint">
              No previous investigations found for this operator.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.session_id}
                onClick={() => onSelect(conv.session_id)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  conv.session_id === activeId
                    ? "bg-surface3/80 text-ink"
                    : "text-ink/60 hover:bg-surface3/40 hover:text-ink/90"
                }`}
              >
                <MessageSquare
                  size={14}
                  className={`mt-0.5 shrink-0 ${
                    conv.session_id === activeId ? "text-info" : "text-faint"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium leading-snug">
                    {conv.title || "New Investigation"}
                  </div>
                  <div className="mt-0.5 text-[10px] text-faint">
                    {new Date(conv.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Operator Footer */}
      <div className="border-t border-line/50 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Operator Shift
        </div>
        <OperatorPicker onOperatorChange={onOperatorChange} />
      </div>
    </div>
  );
}
