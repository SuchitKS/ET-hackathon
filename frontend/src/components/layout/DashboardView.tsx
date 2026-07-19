import { useEffect, useState } from "react";
import { Activity, AlertTriangle, FileWarning, Clock, ShieldAlert } from "lucide-react";

export default function DashboardView() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/dashboard")
      .then((res) => res.json())
      .then((data) => setMetrics(data));
  }, []);

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

        <div className="col-span-1 rounded-lg border border-line bg-surface p-5 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-4">
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
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-colors duration-150 hover:bg-surface2/50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-faint">{label}</span>
        <span className={color === "failure" ? "text-failure" : "text-faint"}>{icon}</span>
      </div>
      <div className="text-[22px] font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}
