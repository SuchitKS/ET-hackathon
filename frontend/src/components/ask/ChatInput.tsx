import { useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="border-t border-line bg-paper p-4">
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-soft focus-within:border-amber/50">
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask about an asset, a failure, or a procedure…"
          className="flex-1 bg-transparent py-1.5 text-[13.5px] text-ink placeholder:text-faint focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber text-paper transition-opacity disabled:opacity-30"
        >
          {disabled ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
        </button>
      </div>
      <div className="mx-auto mt-2 max-w-3xl text-[11.5px] text-faint">
        Routed automatically to Retrieval, RCA, Compliance, or Work Order based on intent.
      </div>
    </div>
  );
}
