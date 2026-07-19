import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="flex flex-col gap-2 px-6 py-4">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className={`relative flex items-start gap-3 rounded-lg border p-3 pr-10 text-[13px] shadow-soft ${
              alert.type === "warning"
                ? "border-rust/25 bg-rust/[0.07] text-rust"
                : "border-teal/25 bg-teal/[0.07] text-teal"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {alert.type === "warning" ? <AlertTriangle size={16} /> : <Info size={16} />}
            </div>
            <div>
              <span className="font-semibold">{alert.asset}: </span>
              {alert.message}
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="absolute right-3 top-3 text-current opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
