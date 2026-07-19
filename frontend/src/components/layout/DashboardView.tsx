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
      <div className="flex h-full items-center justify-center text-soft">
        <span className="text-[13px]">Loading metrics…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <div>
        <div className="font-display text-[20px] font-medium text-ink">Operations dashboard</div>
        <div className="mt-1 text-[13px] text-soft">Real-time KPIs computed directly from the knowledge graph.</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={<AlertTriangle size={18} />}
          tone="rust"
          value={metrics.equipment_at_risk}
          label="Equipment at risk (>1 failure)"
        />
        <KpiCard icon={<Clock size={18} />} tone="amber" value={`${metrics.avg_downtime}h`} label="Avg downtime / incident" />
        <KpiCard
          icon={<ShieldAlert size={18} />}
          tone="teal"
          value={`${metrics.compliance_score}%`}
          label="Est. compliance coverage"
        />
        <KpiCard
          icon={<FileWarning size={18} />}
          tone="plum"
          value={metrics.dangling_refs}
          label="Open doc gaps (dangling)"
        />

        <div className="card p-5 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink">
              <Activity size={18} />
            </div>
            <div>
              <div className="font-display text-[26px] font-semibold leading-tight text-ink">
                {metrics.most_impacted_equipment?.tag || "N/A"}
              </div>
              <div className="text-[13px] text-soft">
                Most impacted equipment ({metrics.most_impacted_equipment?.downtime || 0}h total downtime)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  rust: "bg-rust/10 text-rust",
  amber: "bg-amber/10 text-amber",
  teal: "bg-teal/10 text-teal",
  plum: "bg-plum/10 text-plum",
};

function KpiCard({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: "rust" | "amber" | "teal" | "plum";
  value: string | number;
  label: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
          {icon}
        </div>
        <div>
          <div className="font-display text-[26px] font-semibold leading-tight text-ink">{value}</div>
          <div className="text-[13px] text-soft">{label}</div>
        </div>
      </div>
    </div>
  );
}
