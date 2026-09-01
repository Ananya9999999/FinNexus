import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[12px] bg-surface-2 px-3.5 text-sm text-fg placeholder:text-faint shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-150 focus:shadow-[var(--shadow-border-hover)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
