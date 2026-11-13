"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { loadStarterWorkspace } from "@/app/actions/settings";
import { useQuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";

export function EmptyWorkspace() {
  const router = useRouter();
  const { openNewItem } = useQuickActions();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-(--shadow-card) md:p-10">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-soft blur-3xl" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <Sparkles className="h-3 w-3" /> First step
        </span>
        <h2 className="mt-4 text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[38px]">
          Your workspace is a blank page.
          <br />
          <span className="text-display italic text-primary">Make it yours.</span>
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
          There is no required structure here. Create one area, one project, and one daily goal — you can rearrange
          everything later. Or load a gentle starter structure and delete what doesn&apos;t fit.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button size="lg" onClick={() => openNewItem()} className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Create your first project
          </Button>
          <Button
            size="lg"
            variant="outline"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await loadStarterWorkspace();
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Starter structure created");
                router.refresh();
              })
            }
          >
            Load a starter structure
          </Button>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-muted-2">
          <span>Suggestions:</span>
          {["Work", "Startup", "Study", "Personal"].map((label) => (
            <span key={label} className="rounded-full border border-border bg-surface-2 px-2.5 py-1">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
