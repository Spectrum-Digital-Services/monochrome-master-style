import { useState } from "react";
import { BadgeCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { QUORUM, candidateName, hashString, tallyContest, useElection, ABSTAIN } from "@/lib/election-store";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mono, Panel, PanelHeader, Pill } from "../primitives";

export function Governance() {
  const { modules, toggleModule, trustees, signTrustee, resetCeremony, certified, contests, ballots, stats, publicStandings, setPublicStandings } = useElection();
  const [cert, setCert] = useState(false);
  const signed = trustees.filter((t) => t.signed).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <Panel key={m.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">{m.name}</p>
                <Mono className="text-muted-foreground">{m.version}</Mono>
              </div>
              <Switch checked={m.enabled} onCheckedChange={() => { toggleModule(m.id); toast(`${m.name} ${m.enabled ? "disabled" : "enabled"}`); }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
          </Panel>
        ))}
        <Panel className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">Public live standings</p>
              <Mono className="text-muted-foreground">voter app</Mono>
            </div>
            <Switch checked={publicStandings} onCheckedChange={setPublicStandings} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Show leading candidates on the voter turnout tab.</p>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Electoral Board certification ceremony"
          sub="3-of-5 commissioners must co-sign to seal results"
          right={<Pill solid={certified}>{certified ? "CERTIFIED & SEALED" : `${signed}/3 signatures`}</Pill>}
        />
        <div className="grid gap-3 p-5 md:grid-cols-5">
          {trustees.map((t, i) => (
            <div key={t.name} className={`rounded-xl border p-4 transition ${t.signed ? "border-foreground bg-primary text-primary-foreground" : "border-border"}`}>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-[11px] opacity-70">{t.role}</p>
              {t.signed ? (
                <p className="mt-3 flex items-center gap-1 text-[10px]"><BadgeCheck className="h-3.5 w-3.5" /> <Mono>{t.signature?.slice(0, 12)}</Mono></p>
              ) : (
                <button onClick={() => signTrustee(i)} className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-foreground py-1.5 text-xs font-medium hover:bg-muted">
                  <KeyRound className="h-3 w-3" /> Sign with key
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-hairline px-5 py-3">
          <button disabled={!certified} onClick={() => setCert(true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-30">View official certificate</button>
          <button onClick={resetCeremony} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted">Reset ceremony</button>
        </div>
      </Panel>

      <Dialog open={cert} onOpenChange={setCert}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Official Electoral Board Certificate</DialogTitle></DialogHeader>
          <div className="rounded-xl border-2 border-foreground p-6 text-sm">
            <p className="text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Meridian Cooperative · AGM 2026</p>
            <p className="mt-2 text-center text-xl font-semibold tracking-tight">Certified Results</p>
            <p className="mt-1 text-center text-xs text-muted-foreground">Turnout {stats.turnout.toFixed(1)}% · Quorum {QUORUM}% {stats.quorumMet ? "met" : "not met"}</p>
            <div className="mt-4 divide-y divide-hairline">
              {contests.map((c) => {
                const t = tallyContest(c, ballots, true);
                const lead = Object.entries(t.counts).filter(([k]) => k !== ABSTAIN).sort((a, b) => b[1] - a[1])[0];
                return (
                  <div key={c.id} className="flex justify-between py-2"><span className="text-muted-foreground">{c.title}</span><span className="font-semibold">{lead ? candidateName(c, lead[0]) : "—"}</span></div>
                );
              })}
            </div>
            <div className="mt-4 space-y-1">
              {trustees.filter((t) => t.signed).map((t) => (
                <div key={t.name} className="flex justify-between text-xs"><span>{t.name}, {t.role}</span><Mono>{t.signature?.slice(0, 16)}</Mono></div>
              ))}
            </div>
            <p className="mt-4 break-all text-center font-mono text-[10px] text-muted-foreground">seal:{hashString(trustees.map((t) => t.signature ?? "").join(""), 48)}</p>
          </div>
          <button onClick={() => window.print()} className="rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">Download / print</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
