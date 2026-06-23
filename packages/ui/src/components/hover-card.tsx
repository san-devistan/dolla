"use client"

import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"

import { HoverCardContent } from "./hover-card/content"
import { HoverCardTrigger } from "./hover-card/trigger"

function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
