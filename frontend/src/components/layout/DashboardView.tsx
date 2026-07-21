import { useEffect, useState } from "react";
import { Activity, AlertTriangle, FileWarning, Clock, ShieldAlert } from "lucide-react";
import AlertRow from "@/components/layout/AlertRow";
import type { AlertStatus } from "@/types";

export default function DashboardView() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/dashboard")
      .then((res) => res.json())
      .then((data) => setMetrics(data));
  }, []);

  const handleStatusChanged = (id: string, status: AlertStatus) => {
    setMetrics((prev: any) => ({
      ...prev,
      alerts: prev.alerts?.map((a: any) => a.id === id ? { ...a, status } : a)
    }));
  };

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-faint">
        Loading metrics…
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto px-8 py-10">
      <div>
        <div className="text-[15px] font-semibold text-ink tracking-tight">Operations Dashboard</div>
        <div className="mt-1 text-[12px] text-faint">Real-time KPIs from the knowledge graph.</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<AlertTriangle size={13} strokeWidth={2} />} color="failure" value={metrics.equipment_at_risk} label="Equipment at risk" />
        <KpiCard icon={<Clock size={13} strokeWidth={2} />} color="default" value={`${metrics.avg_downtime}h`} label="Avg downtime / incident" />
        <KpiCard icon={<ShieldAlert size={13} strokeWidth={2} />} color="default" value={`${metrics.compliance_score}%`} label="Compliance coverage" />
        <KpiCard icon={<FileWarning size={13} strokeWidth={2} />} color="default" value={metrics.dangling_refs} label="Open doc gaps" />

        <div className="relative col-span-1 rounded-lg border border-line bg-surface p-5 sm:col-span-2 lg:col-span-4 overflow-hidden transition-all duration-300 hover:shadow-lift hover:border-lineH">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-info/10 blur-[60px] animate-pulse-glow pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface2 border border-line text-ink">
              <Activity size={15} strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-caption text-faint mb-1">MOST IMPACTED EQUIPMENT</div>
              <div className="flex items-baseline gap-2">
                <span className="text-[18px] font-semibold tracking-tight text-ink">
                  {metrics.most_impacted_equipment?.tag || "N/A"}
                </span>
                <span className="text-[12px] text-faint">
                  {metrics.most_impacted_equipment?.downtime || 0}h total downtime
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-2">
          <div className="mb-3 text-[13px] font-semibold tracking-tight text-ink">Active Alerts</div>
          <div className="rounded-lg border border-line bg-surface overflow-hidden">
            {metrics.alerts?.filter((a: any) => a.status === "active" || a.status === "monitoring").length > 0 ? (
              metrics.alerts.filter((a: any) => a.status === "active" || a.status === "monitoring").map((alert: any) => (
                <AlertRow key={alert.id} alert={alert} onStatusChanged={handleStatusChanged} />
              ))
            ) : (
              <div className="px-5 py-6 text-center text-[12.5px] text-faint">
                No active alerts requiring attention.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ReactNode;
  color: "failure" | "default";
  value: string | number;
  label: string;
}) {
  return (
    <div 
      className={`group flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:bg-surface2 ${
        color === "failure" ? "hover:border-failure/30 hover:shadow-failure/10" : "hover:border-info/30 hover:shadow-info/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-faint">{label}</span>
        <span className={`transition-transform duration-300 group-hover:scale-110 ${color === "failure" ? "text-failure" : "text-info"}`}>{icon}</span>
      </div>
      <div className="text-[22px] font-semibold tracking-tight text-ink group-hover:text-white transition-colors">{value}</div>
    </div>
  );
}
