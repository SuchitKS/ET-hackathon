import { NODE_META, NODE_ORDER } from "./graphMeta";

export default function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-lg border border-line bg-surface/90 px-3 py-2 shadow-soft backdrop-blur-sm">
      {NODE_ORDER.map((type) => {
        const meta = NODE_META[type];
        const Icon = meta.icon;
        return (
          <div key={type} className="flex items-center gap-1.5">
            <Icon size={12} color={meta.accent} />
            <span className="text-[12px] text-soft">{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}
