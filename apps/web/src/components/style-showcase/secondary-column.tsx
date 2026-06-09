import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@workspace/ui/components/progress"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
} from "lucide-react"

const progressItems = [
  ["Readiness", 84],
  ["Content", 62],
  ["Automation", 91],
] as const

const channelLabels = ["Email", "SMS", "Portal"]

function renderProgressValue(
  formattedValue: string | null,
  value: number | null
) {
  return formattedValue ?? `${value ?? 0}%`
}

function SecondaryColumn() {
  return (
    <aside className="flex min-w-0 flex-col gap-4">
      <LaunchHealthCard />
      <DispatchCard />
      <NextWindowCard />
    </aside>
  )
}

function LaunchHealthCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Health</CardTitle>
        <CardDescription>
          Preview readiness across content, payments, and messaging.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {progressItems.map(([label, value]) => (
          <Progress key={label} value={value}>
            <ProgressLabel>{label}</ProgressLabel>
            <ProgressValue>{renderProgressValue}</ProgressValue>
          </Progress>
        ))}
      </CardContent>
      <CardFooter className="justify-between border-t">
        <LaunchAvatars />
        <Badge variant="secondary">
          <CheckCircle2Icon data-icon="inline-start" />
          Synced
        </Badge>
      </CardFooter>
    </Card>
  )
}

function LaunchAvatars() {
  return (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>LC</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar>
        <AvatarFallback>DM</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  )
}

function DispatchCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch</CardTitle>
        <CardDescription>
          Compose a small client update and choose delivery channels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DispatchFields />
      </CardContent>
      <CardFooter className="gap-2 border-t">
        <Button variant="outline" className="flex-1">
          <SearchIcon data-icon="inline-start" />
          Preview
        </Button>
        <Button className="flex-1">
          <SparklesIcon data-icon="inline-start" />
          Send
        </Button>
      </CardFooter>
    </Card>
  )
}

function DispatchFields() {
  return (
    <FieldGroup className="gap-6">
      <Field>
        <FieldLabel htmlFor="client">Client</FieldLabel>
        <Input id="client" defaultValue="atelier@example.com" />
        <FieldDescription>Used for the next review packet.</FieldDescription>
      </Field>
      <ChannelFieldSet />
    </FieldGroup>
  )
}

function ChannelFieldSet() {
  return (
    <FieldSet>
      <FieldTitle>Channels</FieldTitle>
      <div className="grid gap-3">
        {channelLabels.map((channel) => (
          <ChannelField key={channel} channel={channel} />
        ))}
      </div>
    </FieldSet>
  )
}

function ChannelField({ channel }: { channel: string }) {
  const isPortal = channel === "Portal"

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={`channel-${channel}`}>{channel}</FieldLabel>
        <FieldDescription>
          {isPortal
            ? "Attach the private gallery link."
            : "Send the short-form notification."}
        </FieldDescription>
      </FieldContent>
      <Switch id={`channel-${channel}`} defaultChecked={channel !== "SMS"} />
    </Field>
  )
}

function NextWindowCard() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Next Window</CardTitle>
        <CardDescription>
          Tomorrow at 09:30, client approvals resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <ReviewRoomSummary />
        <Separator orientation="vertical" />
        <Button size="sm" variant="ghost">
          <Settings2Icon data-icon="inline-start" />
          Configure
        </Button>
      </CardContent>
    </Card>
  )
}

function ReviewRoomSummary() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center bg-muted">
        <CalendarClockIcon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">Review room</div>
        <div className="text-xs text-muted-foreground">12 assets pending</div>
      </div>
    </div>
  )
}

export { SecondaryColumn }
