import { NODE_META, NODE_ORDER } from "./graphMeta";

export default function GraphLegend() {
  return (
    <div className="glass absolute bottom-5 left-5 flex flex-col rounded-md p-1 shadow-soft">
      {NODE_ORDER.map((type) => {
        const meta = NODE_META[type];
        const Icon = meta.icon;
        return (
          <div key={type} className="flex items-center gap-2 rounded-[4px] px-2.5 py-1.5 transition-colors hover:bg-ink/[0.04]">
            <Icon size={10} strokeWidth={1.8} className={type === "failure" ? "text-failure" : "text-faint"} />
            <span className="text-caption text-faint">{meta.label.toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}
