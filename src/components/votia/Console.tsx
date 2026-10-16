import { useState } from "react";
import { Activity, Blocks, Code2, PanelLeftClose, PanelLeftOpen, ScrollText, ShieldHalf, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useElection, type ConsoleModule } from "@/lib/election-store";
import { Dot } from "./primitives";
import { Telemetry } from "./console/Telemetry";
import { Architect } from "./console/Architect";
import { Roster } from "./console/Roster";
import { Governance } from "./console/Governance";
import { ApiGateway } from "./console/ApiGateway";
import { Ledger } from "./console/Ledger";

const NAV: { id: ConsoleModule; label: string; icon: typeof Activity; group: string }[] = [
  { id: "telemetry", label: "Live Telemetry", icon: Activity, group: "Election" },
  { id: "architect", label: "Ballot Architect", icon: Blocks, group: "Election" },
  { id: "roster", label: "Voter Roster", icon: Users, group: "Election" },
  { id: "governance", label: "Board Modules", icon: ShieldHalf, group: "Governance" },
  { id: "api", label: "API Gateway", icon: Code2, group: "Governance" },
  { id: "ledger", label: "Audit Ledger", icon: ScrollText, group: "Governance" },
];

export function Console() {
  const { consoleModule, setConsoleModule, simulating, ballots } = useElection();
  const [collapsed, setCollapsed] = useState(false);
  const current = NAV.find((n) => n.id === consoleModule)!;

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-hairline bg-background shadow-card">
      <aside className={cn("glass flex shrink-0 flex-col border-r border-hairline transition-all", collapsed ? "w-16" : "w-60")}>
        <div className="flex items-center justify-between px-4 py-4">
          {!collapsed && <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Board Console</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        {["Election", "Governance"].map((g) => (
          <div key={g} className="px-2 pb-3">
            {!collapsed && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{g}</p>}
            {NAV.filter((n) => n.group === g).map((n) => (
              <button
                key={n.id}
                onClick={() => setConsoleModule(n.id)}
                title={n.label}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  consoleModule === n.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{n.label}</span>}
                {!collapsed && n.id === "ledger" && <span className="font-mono text-[10px] opacity-70">{ballots.length}</span>}
              </button>
            ))}
          </div>
        ))}
        <div className="mt-auto px-4 py-4 text-[11px] text-muted-foreground">
          {!collapsed && (
            <span className="flex items-center gap-2"><Dot live={simulating} /> {simulating ? "Receiving live traffic" : "Ledger synced"}</span>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <h2 className="mb-5 text-2xl font-semibold tracking-tight">{current.label}</h2>
        {consoleModule === "telemetry" && <Telemetry />}
        {consoleModule === "architect" && <Architect />}
        {consoleModule === "roster" && <Roster />}
        {consoleModule === "governance" && <Governance />}
        {consoleModule === "api" && <ApiGateway />}
        {consoleModule === "ledger" && <Ledger />}
      </main>
    </div>
  );
}
