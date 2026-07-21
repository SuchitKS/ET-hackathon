import { useState, useEffect } from "react";
import { User, ChevronDown, Trash2, Plus } from "lucide-react";
import { getOperator, setOperator } from "@/lib/api";

const DEFAULT_OPERATORS = [
  "R. Sharma",
  "A. Nair",
  "M. Iyer",
  "S. Verma",
  "D. Rao"
];

export default function OperatorPicker({ onOperatorChange }: { onOperatorChange: (op: string) => void }) {
  const [operators, setOperators] = useState<string[]>(DEFAULT_OPERATORS);
  const [current, setCurrent] = useState<string>("R. Sharma");
  const [isOpen, setIsOpen] = useState(false);
  const [newOp, setNewOp] = useState("");

  useEffect(() => {
    // Load custom operators list
    const savedOps = localStorage.getItem("strata_operators");
    if (savedOps) {
      try {
        setOperators(JSON.parse(savedOps));
      } catch (e) {}
    }

    const saved = getOperator();
    if (saved) {
      setCurrent(saved);
      onOperatorChange(saved);
      // Ensure the saved operator is in the list
      setOperators(prev => {
        if (!prev.includes(saved)) {
           const updated = [...prev, saved];
           localStorage.setItem("strata_operators", JSON.stringify(updated));
           return updated;
        }
        return prev;
      });
    } else {
      setOperator("R. Sharma");
      onOperatorChange("R. Sharma");
    }
  }, []);

  const handleSelect = (op: string) => {
    setCurrent(op);
    setOperator(op);
    onOperatorChange(op);
    setIsOpen(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOp.trim()) return;
    const name = newOp.trim();
    if (!operators.includes(name)) {
      const updated = [...operators, name];
      setOperators(updated);
      localStorage.setItem("strata_operators", JSON.stringify(updated));
    }
    handleSelect(name);
    setNewOp("");
  };

  const handleDelete = (e: React.MouseEvent, opToDelete: string) => {
    e.stopPropagation();
    const updated = operators.filter(op => op !== opToDelete);
    setOperators(updated);
    localStorage.setItem("strata_operators", JSON.stringify(updated));
    
    // If we deleted the currently selected one, fallback to the first available
    if (current === opToDelete && updated.length > 0) {
      handleSelect(updated[0]);
    } else if (updated.length === 0) {
      // If deleted all, restore defaults
      setOperators(DEFAULT_OPERATORS);
      localStorage.removeItem("strata_operators");
      handleSelect(DEFAULT_OPERATORS[0]);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-line bg-surface3/30 px-3 py-2 text-sm transition-all duration-300 hover:bg-surface3/60 hover:border-lineH hover:shadow-soft"
      >
        <div className="flex items-center gap-2 text-ink/80">
          <User size={14} className="text-faint" />
          <span className="font-medium text-[12.5px] truncate max-w-[120px]">{current}</span>
        </div>
        <ChevronDown size={14} className="text-faint shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lift animate-slide-up z-50 flex flex-col max-h-64">
          <div className="px-2 py-1.5 border-b border-line/50 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">Select Operator</span>
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {operators.map((op) => (
              <div
                key={op}
                className={`group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors cursor-pointer ${
                  op === current ? "bg-surface3" : "hover:bg-surface2"
                }`}
                onClick={() => handleSelect(op)}
              >
                <span className={`text-[12.5px] truncate ${op === current ? "text-ink font-medium" : "text-ink/70 group-hover:text-ink"}`}>
                  {op}
                </span>
                <button
                  onClick={(e) => handleDelete(e, op)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-faint hover:text-failure transition-all"
                  title="Remove operator"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAdd} className="border-t border-line/50 p-2 shrink-0">
            <div className="flex items-center gap-2 rounded-md bg-surface2/50 px-2 py-1 border border-line/50 focus-within:border-lineH transition-colors">
              <input
                type="text"
                placeholder="New operator..."
                value={newOp}
                onChange={(e) => setNewOp(e.target.value)}
                className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={!newOp.trim()}
                className="p-1 text-info hover:text-info/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
