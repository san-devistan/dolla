import {
  getDisplayText,
  getInlineTextSegments,
} from "@/features/cloudinary/about/_lib/draft-formatting"
import type { AboutContentBlock } from "@/lib/cloudinary.server"
import { cn } from "@workspace/ui/lib/utils"

function AboutText({
  blocks,
  className,
}: {
  blocks: AboutContentBlock[]
  className?: string
}) {
  let headingCount = 0

  return (
    <section
      className={cn(
        "min-w-0 flex-1 px-0 font-heading text-foreground md:px-8",
        className
      )}
    >
      {blocks.map((block) => {
        const displayText = getDisplayText(block)

        if (block.kind === "heading") {
          headingCount += 1
          const Heading = headingCount === 1 ? "h1" : "h2"

          return (
            <Heading
              key={block.id}
              className={cn(
                "mt-4 mb-4 text-lg leading-none font-semibold tracking-[0.1em] text-foreground first:mt-0 md:text-2xl",
                block.bold && "font-bold"
              )}
            >
              {displayText}
            </Heading>
          )
        }

        return (
          <p
            key={block.id}
            className={cn(
              "mb-4 text-base leading-snug whitespace-pre-line md:text-lg",
              block.bold && "font-semibold text-foreground"
            )}
          >
            <AboutInlineText text={displayText} isBold={block.bold} />
          </p>
        )
      })}
    </section>
  )
}

function AboutInlineText({ isBold, text }: { isBold: boolean; text: string }) {
  if (isBold) {
    return <>{text}</>
  }

  return (
    <>
      {getInlineTextSegments(text).map((segment) =>
        segment.bold ? (
          <strong key={segment.id} className="text-foreground">
            {segment.text}
          </strong>
        ) : (
          <span key={segment.id}>{segment.text}</span>
        )
      )}
    </>
  )
}

export { AboutText }
