"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "./utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (iconRef.current) {
      const r = iconRef.current.getBoundingClientRect();
      setCoords({ top: r.top + r.height / 2, left: r.right + 6 });
    }
    setVisible(true);
  };
  const hide = () => setVisible(false);

  return (
    <span
      ref={iconRef}
      className="inline-flex items-center cursor-default"
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ marginTop: "0.5px" }}
    >
      <Info size={9} className={`transition-opacity ${visible ? "opacity-90" : "opacity-50"} text-text-dim`} />
      {visible && createPortal(
        <span
          className="fixed z-[99999] pointer-events-none"
          style={{ top: coords.top, left: coords.left, transform: "translateY(-50%)", minWidth: 200, maxWidth: 260 }}
        >
          <span
            className="block bg-[#0f172a] border border-white/20 rounded-md shadow-2xl px-3 py-2 normal-case tracking-normal leading-relaxed"
            style={{ fontSize: "11px", fontWeight: 400, letterSpacing: 0, whiteSpace: "pre-line", color: "#e2e8f0" }}
          >
            {text}
          </span>
        </span>,
        document.body
      )}
    </span>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, InfoTooltip };
