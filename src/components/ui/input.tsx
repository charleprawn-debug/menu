import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, leading, trailing, ...props }, ref) => {
    if (leading || trailing) {
      return (
        <div
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20",
            invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
            className
          )}
        >
          {leading ? <span className="text-muted-foreground [&_svg]:size-4">{leading}</span> : null}
          <input
            type={type}
            ref={ref}
            className="h-full w-full bg-transparent outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
          {trailing ? <span className="text-muted-foreground [&_svg]:size-4">{trailing}</span> : null}
        </div>
      );
    }
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
