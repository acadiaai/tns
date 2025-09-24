import * as React from "react";

import { cn } from "@/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl glass-input px-3 py-2 text-sm text-theme-light placeholder:text-theme-subtle focus:outline-none focus:ring-2 focus:ring-white/25 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input }; 