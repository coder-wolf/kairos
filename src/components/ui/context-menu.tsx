"use client";

import * as React from "react";
import * as ContextPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";

export const ContextMenu = ContextPrimitive.Root;
export const ContextMenuTrigger = ContextPrimitive.Trigger;

export function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextPrimitive.Content>) {
  return (
    <ContextPrimitive.Portal>
      <ContextPrimitive.Content
        className={cn(
          "z-50 min-w-[190px] overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-(--shadow-pop) data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </ContextPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof ContextPrimitive.Item> & { destructive?: boolean }) {
  return (
    <ContextPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none transition-colors data-[highlighted]:bg-surface-2",
        destructive ? "text-danger" : "text-text",
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuLabel({ className, ...props }: React.ComponentProps<typeof ContextPrimitive.Label>) {
  return (
    <ContextPrimitive.Label
      className={cn("px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2", className)}
      {...props}
    />
  );
}

export function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof ContextPrimitive.Separator>) {
  return <ContextPrimitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
