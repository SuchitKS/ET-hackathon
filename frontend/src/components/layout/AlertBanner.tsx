import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

type Alert = {
  id: string;
  type: "warning" | "info";
  message: string;
  asset: string;
};

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch(console.error);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`group relative flex items-center gap-2.5 border-b border-line px-5 py-2 text-[11.5px] ${
            alert.type === "warning" ? "text-failure" : "text-info"
          }`}
        >
          <div className={`absolute left-0 top-0 h-full w-[2px] ${
            alert.type === "warning" ? "bg-failure/60" : "bg-info/60"
          }`} />
          <div className="shrink-0 opacity-70">
            {alert.type === "warning" ? <AlertTriangle size={11} strokeWidth={2.5} /> : <Info size={11} strokeWidth={2.5} />}
          </div>
          <div className="flex flex-1 items-center gap-2 text-ink/80">
            <span className="font-mono text-caption">{alert.asset}</span>
            <span className="text-[11.5px] font-medium">{alert.message}</span>
          </div>
          <button
            onClick={() => dismissAlert(alert.id)}
            className="shrink-0 p-0.5 text-faint opacity-0 transition-opacity duration-150 hover:text-ink group-hover:opacity-100"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
