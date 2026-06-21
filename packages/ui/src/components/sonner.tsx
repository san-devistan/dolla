"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import type * as React from "react"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

const SONNER_ICONS = {
  success: <CircleCheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
  error: <OctagonXIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
} satisfies ToasterProps["icons"]

type SonnerStyle = React.CSSProperties &
  Record<
    "--border-radius" | "--normal-bg" | "--normal-border" | "--normal-text",
    string
  >

const SONNER_STYLE: SonnerStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
}

const SONNER_TOAST_OPTIONS = {
  classNames: {
    toast: "cn-toast",
  },
} satisfies ToasterProps["toastOptions"]

function isToasterTheme(
  theme: string | undefined
): theme is ToasterProps["theme"] {
  return theme === "dark" || theme === "light" || theme === "system"
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const sonnerTheme = isToasterTheme(theme) ? theme : "system"

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      icons={SONNER_ICONS}
      style={SONNER_STYLE}
      toastOptions={SONNER_TOAST_OPTIONS}
      {...props}
    />
  )
}

export { Toaster, toast }
