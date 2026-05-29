import React from "react";
import { cn } from "./utils";

export function WidgetCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-sm border border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
