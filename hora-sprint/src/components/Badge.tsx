import { type ReactNode } from "react";

type BadgeVariant =
  | "purple"
  | "teal"
  | "gold"
  | "coral"
  | "green"
  | "blue"
  | "gray";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  purple: "bg-accent/15 text-accent",
  teal: "bg-teal/15 text-teal",
  gold: "bg-gold/15 text-gold",
  coral: "bg-coral/15 text-coral",
  green: "bg-green/15 text-green",
  blue: "bg-blue/15 text-blue",
  gray: "bg-border text-text-muted",
};

export function Badge({ children, variant = "purple", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
