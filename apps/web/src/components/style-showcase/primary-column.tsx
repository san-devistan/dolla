import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  BellIcon,
  CameraIcon,
  CreditCardIcon,
  InboxIcon,
  Layers3Icon,
} from "lucide-react"

const metrics = [
  {
    label: "Active Shoots",
    value: "18",
    delta: "+4",
    icon: CameraIcon,
  },
  {
    label: "Open Invoices",
    value: "7",
    delta: "2 due",
    icon: CreditCardIcon,
  },
  {
    label: "Inbox SLA",
    value: "42m",
    delta: "fast",
    icon: InboxIcon,
  },
]

const workstreamTabs = [
  {
    value: "studio",
    label: "Studio",
    icon: Layers3Icon,
    items: [
      ["Editorial board", "Creative", "In review"],
      ["Client approvals", "Operations", "Live"],
      ["Retouch queue", "Post", "Queued"],
    ],
  },
  {
    value: "billing",
    label: "Billing",
    icon: CreditCardIcon,
    items: [
      ["Wedding deposit", "Stripe", "Live"],
      ["Corporate package", "Sales", "Queued"],
      ["Renewal reminder", "Email", "In review"],
    ],
  },
  {
    value: "support",
    label: "Support",
    icon: BellIcon,
    items: [
      ["Reschedule request", "Inbox", "Live"],
      ["Contract follow-up", "Legal", "In review"],
      ["Asset handoff", "Delivery", "Queued"],
    ],
  },
]

const productionRows = [
  {
    id: "shoot-142",
    client: "Maison Verre",
    type: "Editorial",
    stage: "Live",
    owner: "LC",
    due: "Today",
  },
  {
    id: "shoot-138",
    client: "Atelier Nine",
    type: "Campaign",
    stage: "In review",
    owner: "DM",
    due: "Tue",
  },
  {
    id: "shoot-127",
    client: "North Pier",
    type: "Event",
    stage: "Queued",
    owner: "AL",
    due: "Fri",
  },
]

function PrimaryColumn() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <MetricsGrid />
      <WorkstreamsCard />
      <ProductionQueueCard />
    </section>
  )
}

function MetricsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </div>
  )
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{metric.label}</CardTitle>
        <CardAction>
          <metric.icon className="size-4 text-muted-foreground" />
        </CardAction>
        <CardDescription>{metric.delta}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-semibold tracking-wide tabular-nums">
          {metric.value}
        </div>
      </CardContent>
    </Card>
  )
}

function WorkstreamsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workstreams</CardTitle>
        <CardDescription>
          Team queues grouped by the surface they affect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WorkstreamTabs />
      </CardContent>
    </Card>
  )
}

function WorkstreamTabs() {
  return (
    <Tabs defaultValue="studio" className="gap-6">
      <TabsList variant="line" className="w-full justify-start">
        {workstreamTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            <tab.icon data-icon="inline-start" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {workstreamTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <WorkstreamItems items={tab.items} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function WorkstreamItems({ items }: { items: Array<Array<string>> }) {
  return (
    <div className="grid gap-3">
      {items.map(([name, team, state]) => (
        <WorkstreamItem key={name} name={name} team={team} state={state} />
      ))}
    </div>
  )
}

function WorkstreamItem({
  name,
  team,
  state,
}: {
  name: string
  team: string
  state: string
}) {
  return (
    <div className="grid gap-3 border-b py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{team}</div>
      </div>
      <Badge variant="secondary">{state}</Badge>
      <Button variant="ghost" size="sm">
        Open
      </Button>
    </div>
  )
}

function ProductionQueueCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Queue</CardTitle>
        <CardDescription>
          Current jobs moving through client review and delivery.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductionTable />
      </CardContent>
    </Card>
  )
}

function ProductionTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productionRows.map((row) => (
          <ProductionRow key={row.id} row={row} />
        ))}
      </TableBody>
    </Table>
  )
}

function ProductionRow({ row }: { row: (typeof productionRows)[number] }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.client}</TableCell>
      <TableCell>{row.type}</TableCell>
      <TableCell>
        <Badge variant={row.stage === "Queued" ? "secondary" : "default"}>
          {row.stage}
        </Badge>
      </TableCell>
      <TableCell>{row.owner}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {row.due}
      </TableCell>
    </TableRow>
  )
}

export { PrimaryColumn }
