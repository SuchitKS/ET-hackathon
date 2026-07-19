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
    <header className="glass sticky top-0 z-50 flex h-11 shrink-0 items-center justify-between px-5">
      <div className="flex items-center gap-10">
        <span className="font-sans text-[11px] font-semibold tracking-[0.15em] uppercase text-ink/80">Strata</span>

        <nav className="flex items-center gap-8">
          <NavTab active={view === "ask"} onClick={() => onChange("ask")} icon={<MessageSquareText size={13} strokeWidth={1.8} />}>
            Investigate
          </NavTab>
          <NavTab active={view === "dashboard"} onClick={() => onChange("dashboard")} icon={<LayoutDashboard size={13} strokeWidth={1.8} />}>
            Dashboard
          </NavTab>
          <NavTab active={view === "graph"} onClick={() => onChange("graph")} icon={<Workflow size={13} strokeWidth={1.8} />}>
            Graph
          </NavTab>
          <NavTab active={view === "documents"} onClick={() => onChange("documents")} icon={<FileStack size={13} strokeWidth={1.8} />}>
            Documents
          </NavTab>
        </nav>
      </div>

      {trackedAsset && (
        <div className="flex items-center gap-3">
          <span className="text-caption text-faint">TRACKING</span>
          <span className="font-mono text-[11px] text-ink/70">{trackedAsset}</span>
        </div>
      )}
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
      className={`relative flex items-center gap-1.5 py-3.5 text-[12px] font-medium transition-colors duration-150 ${
        active ? "text-ink" : "text-faint hover:text-soft"
      }`}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[1px] bg-ink/50" />
      )}
    </button>
  );
}
