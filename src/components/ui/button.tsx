import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,background-color,box-shadow,color,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-fg",
        secondary: "bg-surface-2 text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
        ghost: "bg-transparent text-muted hover:text-fg hover:bg-surface-2",
        danger: "bg-down/15 text-down hover:bg-down/25",
      },
      size: {
        sm: "h-9 rounded-[8px] px-3 text-sm",
        md: "h-11 rounded-[12px] px-4 text-sm",
        lg: "h-12 rounded-[14px] px-5 text-base",
        icon: "size-11 rounded-[12px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
