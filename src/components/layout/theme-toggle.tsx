"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { updatePreferences } from "@/app/actions/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({ user }: { user: UserSummary }) {
  const router = useRouter();
  const [theme, setTheme] = React.useState(user.theme);

  const apply = (next: "light" | "dark" | "system") => {
    setTheme(next);
    applyTheme(next);
    updatePreferences({ timezone: user.timezone, weekStartsOn: user.weekStartsOn, theme: next })
      .then((result) => {
        if (!result.ok) toast.error(result.error);
        else router.refresh();
      })
      .catch(() => toast.error("Could not save the theme."));
  };

  const CurrentIcon = OPTIONS.find((option) => option.value === theme)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Change theme"
        >
          <CurrentIcon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => apply(option.value)}
            className={cn(theme === option.value && "bg-surface-2 font-semibold")}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
            {theme === option.value ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
