import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  const style = React.useMemo(
    () => ({ "--ratio": ratio }) satisfies React.CSSProperties,
    [ratio]
  )

  return (
    <div
      data-slot="aspect-ratio"
      style={style}
      className={cn("relative aspect-(--ratio)", className)}
      {...props}
    />
  )
}

export { AspectRatio }
