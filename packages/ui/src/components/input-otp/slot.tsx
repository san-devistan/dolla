import { cn } from "@workspace/ui/lib/utils"
import { OTPInputContext } from "input-otp"
import * as React from "react"

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.use(OTPInputContext)
  const slot = inputOTPContext?.slots[index]
  const char = slot?.char
  const hasFakeCaret = slot?.hasFakeCaret
  const isActive = slot?.isActive

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex size-10 items-center justify-center border border-transparent border-b-input bg-transparent text-sm transition-[color,border-color] outline-none first:rounded-none last:rounded-none aria-invalid:border-b-destructive data-[active=true]:z-10 data-[active=true]:border-b-ring dark:aria-invalid:border-b-destructive/50",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}

export { InputOTPSlot }
