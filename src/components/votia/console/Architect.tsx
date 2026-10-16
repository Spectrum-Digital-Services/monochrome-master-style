import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useElection, type ContestType } from "@/lib/election-store";
import { Switch } from "@/components/ui/switch";
import { Panel, PanelHeader, Pill } from "../primitives";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground";

export function Architect() {
  const { contests, updateContest, addContest, removeContest, addCandidate, removeCandidate } = useElection();
  const [drafts, setDrafts] = useState<Record<string, { name: string; role: string; manifesto: string }>>({});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["plurality", "ranked", "approval", "resolution"] as ContestType[]).map((t) => (
          <button key={t} onClick={() => { addContest(t); toast.success(`New ${t} contest added to the ballot`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium capitalize active:scale-[0.98] hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> {t}
          </button>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {contests.map((c) => {
          const d = drafts[c.id] ?? { name: "", role: "", manifesto: "" };
          return (
            <Panel key={c.id}>
              <PanelHeader
                title={c.title}
                sub={`${c.candidates.length} options`}
                right={
                  <div className="flex items-center gap-2">
                    <Pill>{c.type}</Pill>
                    <button onClick={() => removeContest(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
                  </div>
                }
              />
              <div className="space-y-4 p-5">
                <input className={field} value={c.title} onChange={(e) => updateContest(c.id, { title: e.target.value })} />
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">Abstain <Switch checked={c.allowAbstain} onCheckedChange={(v) => updateContest(c.id, { allowAbstain: v })} /></label>
                  <label className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">Write-in <Switch checked={c.allowWriteIn} disabled={c.type !== "plurality"} onCheckedChange={(v) => updateContest(c.id, { allowWriteIn: v })} /></label>
                  <label className="flex items-center justify-between gap-1 rounded-lg bg-surface-2 px-3 py-2">Pass %
                    <input type="number" className="w-14 rounded bg-surface px-1.5 py-0.5 text-right font-mono" value={c.threshold} onChange={(e) => updateContest(c.id, { threshold: Number(e.target.value) })} />
                  </label>
                </div>
                <div className="divide-y divide-hairline rounded-xl border border-hairline">
                  {c.candidates.map((cand) => (
                    <div key={cand.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{cand.name}</p>
                        {cand.role && <p className="text-xs text-muted-foreground">{cand.role}</p>}
                      </div>
                      {c.type !== "resolution" && (
                        <button onClick={() => removeCandidate(c.id, cand.id)} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  ))}
                  {!c.candidates.length && <p className="px-3 py-3 text-xs text-muted-foreground">No candidates yet.</p>}
                </div>
                {c.type !== "resolution" && (
                  <form
                    className="grid grid-cols-2 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!d.name.trim()) return;
                      addCandidate(c.id, d);
                      setDrafts((x) => ({ ...x, [c.id]: { name: "", role: "", manifesto: "" } }));
                      toast.success(`${d.name} now appears on the mobile ballot`);
                    }}
                  >
                    <input className={field} placeholder="Candidate name" value={d.name} onChange={(e) => setDrafts((x) => ({ ...x, [c.id]: { ...d, name: e.target.value } }))} />
                    <input className={field} placeholder="Role / title" value={d.role} onChange={(e) => setDrafts((x) => ({ ...x, [c.id]: { ...d, role: e.target.value } }))} />
                    <input className={`${field} col-span-2`} placeholder="Manifesto" value={d.manifesto} onChange={(e) => setDrafts((x) => ({ ...x, [c.id]: { ...d, manifesto: e.target.value } }))} />
                    <button className="col-span-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground active:scale-[0.99]">Add candidate</button>
                  </form>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
