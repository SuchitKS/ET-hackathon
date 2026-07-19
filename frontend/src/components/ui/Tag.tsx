import type { ReactNode } from "react";

type Tone = "amber" | "teal" | "rust" | "plum" | "neutral";

const toneClasses: Record<Tone, string> = {
  amber: "bg-amber/10 text-amber border-amber/20",
  teal: "bg-teal/10 text-teal border-teal/20",
  rust: "bg-rust/10 text-rust border-rust/20",
  plum: "bg-plum/10 text-plum border-plum/20",
  neutral: "bg-surface2 text-soft border-line",
};

export default function Tag({
  children,
  tone = "neutral",
  icon,
  mono = false,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] ${
        mono ? "font-mono tracking-tight" : "font-sans font-medium"
      } ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
