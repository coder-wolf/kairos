import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-contrast shadow-[0_1px_2px_rgba(20,20,40,0.15)] hover:bg-primary-hover active:translate-y-px",
  secondary:
    "bg-surface-3 text-text hover:bg-border-strong/60 active:translate-y-px",
  outline:
    "border border-border-strong bg-surface text-text hover:bg-surface-2 active:translate-y-px",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-danger text-white hover:opacity-90 active:translate-y-px",
  soft: "bg-primary-soft text-primary hover:bg-primary-soft/70",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px] font-semibold",
  md: "h-10 gap-2 rounded-xl px-4 text-sm font-semibold",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px] font-semibold",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all duration-150 disabled:pointer-events-none disabled:opacity-55",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});

export function IconButton({
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: ButtonProps) {
  return <Button className={cn("p-0", className)} variant={variant} size={size} {...props} />;
}
