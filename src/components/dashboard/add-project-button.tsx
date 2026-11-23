"use client";

import { Plus } from "lucide-react";
import { useQuickActions } from "@/components/quick-actions";

export function AddProjectButton() {
  const { openNewItem } = useQuickActions();

  return (
    <button
      type="button"
      onClick={() => openNewItem()}
      aria-label="Add project"
      title="Add project"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
