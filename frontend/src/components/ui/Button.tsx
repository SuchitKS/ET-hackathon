import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost";
}

export default function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-sans text-[11px] font-medium px-3 py-1.5 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-ink/10 text-ink hover:bg-ink/15",
    ghost: "bg-transparent border border-line text-ink hover:bg-surface2",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
