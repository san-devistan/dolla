import { cn } from "@workspace/ui/lib/utils"
import type * as React from "react"

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center gap-1 rounded-none has-aria-invalid:border-b-destructive dark:has-aria-invalid:border-b-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { InputOTPGroup }
