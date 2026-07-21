import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import type { Alert } from "@/types";
import { fetchAlerts } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetchAlerts().then(data => {
      // Only show active alerts as notifications
      const activeAlerts = data.filter((a: Alert) => a.status === "active");
      setAlerts(activeAlerts);
      
      // Auto-dismiss after 6 seconds
      if (activeAlerts.length > 0) {
        const timer = setTimeout(() => {
          setAlerts([]);
        }, 6000);
        return () => clearTimeout(timer);
      }
    }).catch(console.error);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={`group relative flex items-center gap-2.5 border-b border-line px-5 py-2 text-[11.5px] ${
              alert.type === "warning" ? "text-failure bg-failure/5" : "text-info bg-info/5"
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
              className="shrink-0 p-0.5 text-faint opacity-50 transition-opacity duration-150 hover:text-ink hover:opacity-100"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
