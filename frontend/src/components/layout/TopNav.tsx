import { Workflow, MessageSquareText, FileStack, LayoutDashboard } from "lucide-react";

type View = "ask" | "graph" | "documents" | "dashboard";

export default function TopNav({
  view,
  onChange,
  trackedAsset,
}: {
  view: View;
  onChange: (v: View) => void;
  trackedAsset?: string | null;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-9">
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 32 32" className="shrink-0">
            <rect width="32" height="32" rx="9" fill="#B5651D" />
            <circle cx="10" cy="10" r="3" fill="#FBF5E8" />
            <circle cx="23" cy="9" r="2.2" fill="#FBF5E8" />
            <circle cx="22" cy="23" r="3" fill="#FBF5E8" />
            <circle cx="9" cy="22" r="2.2" fill="#FBF5E8" />
            <path
              d="M12.4 11.2L20.8 9.6M11.4 12.6L20.2 21.3M21.4 11.1L21.9 21M11 20.6L20 22.1"
              stroke="#FBF5E8"
              strokeWidth="1.1"
              fill="none"
            />
          </svg>
          <span className="font-display text-[19px] font-semibold italic tracking-tight text-ink">strata</span>
        </div>

        <nav className="flex items-center gap-1">
          <NavTab active={view === "ask"} onClick={() => onChange("ask")} icon={<MessageSquareText size={15} />}>
            Ask
          </NavTab>
          <NavTab active={view === "dashboard"} onClick={() => onChange("dashboard")} icon={<LayoutDashboard size={15} />}>
            Dashboard
          </NavTab>
          <NavTab active={view === "graph"} onClick={() => onChange("graph")} icon={<Workflow size={15} />}>
            Graph
          </NavTab>
          <NavTab active={view === "documents"} onClick={() => onChange("documents")} icon={<FileStack size={15} />}>
            Documents
          </NavTab>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        {trackedAsset && (
          <>
            <span className="hidden text-[13px] text-soft sm:inline">Tracked asset</span>
            <span className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-[13px] font-medium text-ink">
              {trackedAsset}
            </span>
          </>
        )}
      </div>
    </header>
  );
}

function NavTab({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors ${
        active ? "text-ink" : "text-soft hover:text-ink"
      }`}
    >
      {icon}
      {children}
      {active && <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-amber" />}
    </button>
  );
}
