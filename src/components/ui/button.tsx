import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[0.85rem] border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-primary bg-card text-primary hover:bg-primary/10",
        secondary: "border-[#b9a244] bg-secondary text-secondary-foreground hover:bg-[#f7e68d]",
        outline: "border-[#3f3b3b] bg-white text-[#333333] hover:bg-stone-50",
        mint: "border-[#38d3b0] bg-[#f4fffb] text-[#198b73] hover:bg-[#e8fff7]",
        pink: "border-[#ff5fd0] bg-[#fff4fd] text-[#d33ca8] hover:bg-[#ffe9fb]",
        danger: "border-[#ff6a63] bg-[#fff7f7] text-[#f04e48] hover:bg-[#ffefee]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-8 rounded-full px-4 text-xs",
        tile: "h-[2.9rem] min-w-[4rem] px-4 py-2",
        banner: "h-12 w-full px-5 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
