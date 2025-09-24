import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "glass-card-strong text-theme-light hover:bg-white/25 hover:border-white/40 shadow-lg",
        destructive:
          "bg-red-500/25 text-red-100 border border-red-400/40 hover:bg-red-500/35 hover:border-red-400/50 backdrop-blur-md shadow-lg",
        outline:
          "glass-card text-theme-light hover:bg-white/15 hover:border-white/35 shadow-md",
        secondary:
          "bg-white/15 text-theme-light border border-white/25 hover:bg-white/25 hover:border-white/35 backdrop-blur-md shadow-md",
        ghost: "text-theme-light hover:bg-white/15 hover:border-white/20 border border-transparent",
        link: "text-theme-light underline-offset-4 hover:underline",
        accent: "glass-card-strong text-theme-light hover:bg-white/25 accent-border shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants }; 