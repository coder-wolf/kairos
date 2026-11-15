"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { cancelSubscription } from "@/app/actions/billing";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";

export function CancelPlanButton({ periodEnd }: { periodEnd: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-9 gap-1.5 px-3 text-[12px] font-semibold text-muted hover:text-danger"
        onClick={() => setOpen(true)}
      >
        <Ban className="h-3.5 w-3.5" />
        Cancel plan
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel Kairos Pro?"
        description={
          periodEnd
            ? `Your Pro features stay active until ${periodEnd}. You won't be charged again after that.`
            : "Your subscription will stop renewing. Pro features remain available until the end of the current billing period."
        }
        confirmLabel="Cancel subscription"
        destructive
        onConfirm={async () => {
          const result = await cancelSubscription();
          if (result.ok) {
            toast.success(result.message ?? "Subscription cancelled.");
            router.refresh();
          }
          return result;
        }}
      />
    </>
  );
}
