import { useState } from "react";
import TopNav from "@/components/layout/TopNav";
import AskView from "@/components/ask/AskView";
import GraphView from "@/components/graph/GraphView";
import DocumentsView from "@/components/documents/DocumentsView";
import DashboardView from "@/components/layout/DashboardView";

type View = "ask" | "graph" | "documents" | "dashboard";

export default function App() {
  const [view, setView] = useState<View>("ask");
  const [trackedAsset, setTrackedAsset] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col bg-paper">
      <TopNav view={view} onChange={setView} trackedAsset={trackedAsset} />
      <main className="min-h-0 flex-1">
        {view === "ask" && <AskView onTrackedAsset={setTrackedAsset} />}
        {view === "dashboard" && <DashboardView />}
        {view === "graph" && <GraphView />}
        {view === "documents" && <DocumentsView />}
      </main>
    </div>
  );
}
