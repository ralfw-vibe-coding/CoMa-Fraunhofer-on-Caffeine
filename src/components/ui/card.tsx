import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[1.6rem] border border-white/70 bg-card shadow-card",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { Card };
