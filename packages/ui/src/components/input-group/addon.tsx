"use client"

import { cn } from "@workspace/ui/lib/utils"
import { type VariantProps } from "class-variance-authority"
import * as React from "react"

import { inputGroupAddonVariants } from "./variants"

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button")
      ) {
        return
      }

      event.currentTarget.parentElement?.querySelector("input")?.focus()
    },
    []
  )

  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onPointerDown={handlePointerDown}
      {...props}
    />
  )
}

export { InputGroupAddon }
