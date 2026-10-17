import { useState } from "react";
import { Search, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENTS, useElection } from "@/lib/election-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mono, Panel, PanelHeader, Pill } from "../primitives";

export function Roster() {
  const { voters, setActiveToken, setWorkspace, workspace, mintVoters, revokeVoter, setVoterWeight } = useElection();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [open, setOpen] = useState(false);
  const [mint, setMint] = useState({ count: 5, dept: DEPARTMENTS[0], weight: 1 });

  const rows = voters.filter(
    (v) => (dept === "all" || v.dept === dept) && (v.name.toLowerCase().includes(q.toLowerCase()) || v.token.toLowerCase().includes(q.toLowerCase())),
  );
  const counts = (["Delivered", "Opened", "Voted", "Bounced"] as const).map((s) => [s, voters.filter((v) => v.status === s).length] as const);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {counts.map(([s, n]) => (
          <Panel key={s} className="p-4">
            <p className="text-xs text-muted-foreground">{s}</p>
            <p className="font-mono text-2xl font-semibold">{n}</p>
          </Panel>
        ))}
      </div>
      <Panel>
        <PanelHeader
          title="Voter roster & access keys"
          sub={`${voters.length} members`}
          right={
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground active:scale-[0.98]">
              <Send className="h-3.5 w-3.5" /> Mint & dispatch keys
            </button>
          }
        />
        <div className="flex gap-2 border-b border-hairline px-5 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or token" className="w-full bg-transparent py-2 text-sm outline-none" />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-lg border border-border bg-surface px-2 text-xs">
            <option value="all">All units</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted-foreground">
              <tr className="border-b border-hairline">
                {["Token", "Member", "Department", "Weight", "Status", ""].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.token} className="border-b border-hairline hover:bg-surface-2">
                  <td className="px-5 py-2.5"><Mono className="font-semibold">{v.token}</Mono></td>
                  <td className="px-5 py-2.5">{v.name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{v.dept}</td>
                  <td className="px-5 py-2.5">
                    <select value={v.weight} disabled={v.status === "Voted"} onChange={(e) => setVoterWeight(v.token, Number(e.target.value))} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {[1, 1.5, 2, 2.5].map((w) => <option key={w} value={w}>{w.toFixed(1)}x</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-2.5"><Pill solid={v.status === "Voted"} className={v.status === "Bounced" ? "line-through opacity-60" : ""}>{v.status}</Pill></td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => { setActiveToken(v.token); if (workspace === "console") setWorkspace("dual"); toast(`${v.token} loaded into the voter app`); }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      ><Smartphone className="h-3 w-3" /> Load</button>
                      {v.status !== "Voted" && v.status !== "Bounced" && (
                        <button onClick={() => revokeVoter(v.token)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Revoke</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mint & dispatch voter access keys</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block">Quantity
              <input type="number" min={1} max={50} value={mint.count} onChange={(e) => setMint({ ...mint, count: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border px-3 py-2" />
            </label>
            <label className="block">Department
              <select value={mint.dept} onChange={(e) => setMint({ ...mint, dept: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2">
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">Weight multiplier
              <select value={mint.weight} onChange={(e) => setMint({ ...mint, weight: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2">
                <option value={1}>1.0x Standard Member</option>
                <option value={2}>2.0x Institutional</option>
                <option value={2.5}>2.5x Senior Partner</option>
              </select>
            </label>
            <button
              onClick={() => {
                const fresh = mintVoters(Math.max(1, Math.min(50, mint.count)), mint.dept ?? DEPARTMENTS[0] ?? "Operations", mint.weight);
                setOpen(false);
                toast.success(`${fresh.length} keys dispatched`, {
                  description: fresh.map((f) => f.token).slice(0, 4).join(", "),
                  action: { label: "Load first", onClick: () => { const first = fresh[0]; if (first) setActiveToken(first.token); if (workspace === "console") setWorkspace("dual"); } },
                });
              }}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground"
            >Mint & dispatch</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
