"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TooltipIconButtonProps extends ComponentProps<typeof Button> {
  /** Shown in the tooltip and as the button's accessible name. */
  label: string;
  side?: ComponentProps<typeof TooltipContent>["side"];
}

/** Icon-only button with a tooltip explaining what it does — same pattern already used in folder-media-header.tsx. */
export function TooltipIconButton({ label, side = "top", size = "icon-lg", ...props }: TooltipIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size={size} aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
