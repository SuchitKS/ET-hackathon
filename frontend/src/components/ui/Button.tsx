import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost";
}

export default function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-sans text-[13.5px] font-medium px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-amber text-paper hover:bg-amber/90 shadow-soft",
    ghost: "bg-transparent border border-line text-ink hover:border-faint hover:bg-surface2",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
