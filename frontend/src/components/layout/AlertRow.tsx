import { AlertTriangle, Info, Check, Eye, Trash2, PenTool, X } from "lucide-react";
import type { Alert, AlertStatus } from "@/types";
import { updateAlertStatus } from "@/lib/api";

export default function AlertRow({ 
  alert, 
  onStatusChanged 
}: { 
  alert: Alert;
  onStatusChanged: (id: string, status: AlertStatus) => void;
}) {
  const isResolved = alert.status === "cleared" || alert.status === "false_positive";

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as AlertStatus;
    try {
      await updateAlertStatus(alert.id, newStatus);
      onStatusChanged(alert.id, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
      // Revert select visually if failed (simple implementation relies on parent state refresh)
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-2.5 border-b border-line px-5 py-2.5 transition-all duration-300 hover:bg-surface2/50 ${
        isResolved ? "opacity-40 hover:opacity-70" : "hover:pl-6"
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-[2px] ${
        alert.type === "warning" ? "bg-failure/60" : "bg-info/60"
      }`} />
      
      <div className={`shrink-0 ${alert.type === "warning" ? "text-failure" : "text-info"}`}>
        {alert.type === "warning" ? <AlertTriangle size={13} strokeWidth={2.5} /> : <Info size={13} strokeWidth={2.5} />}
      </div>
      
      <div className="flex flex-1 items-center gap-3 text-ink/80">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-faint uppercase bg-surface3/50 px-1.5 py-0.5 rounded">
          {alert.asset}
        </span>
        <span className={`text-[12px] font-medium leading-snug ${isResolved ? "line-through text-faint" : ""}`}>
          {alert.message}
        </span>
      </div>
      
      <div className="shrink-0 flex items-center gap-2">
        <select
          value={alert.status}
          onChange={handleStatusChange}
          className={`
            appearance-none rounded border border-line bg-surface px-2 py-1 text-[11px] font-medium transition-colors
            focus:border-lineH focus:outline-none focus:ring-1 focus:ring-lineH cursor-pointer
            ${alert.status === "active" ? "text-failure border-failure/30 bg-failure/5" : ""}
            ${alert.status === "monitoring" ? "text-warn border-warn/30 bg-warn/5" : ""}
            ${alert.status === "under_maintenance" ? "text-info border-info/30 bg-info/5" : ""}
            ${isResolved ? "text-faint" : ""}
          `}
        >
          <option value="active">Active</option>
          <option value="monitoring">Monitoring</option>
          <option value="under_maintenance">Maintenance</option>
          <option value="cleared">Cleared</option>
          <option value="false_positive">False Pos</option>
        </select>
      </div>
    </div>
  );
}
