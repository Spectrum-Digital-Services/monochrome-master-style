import { useState } from "react";
import { Cpu, KeyRound, ShieldCheck, Users } from "lucide-react";
import { ABSTAIN, QUORUM, candidateName, runoff, shortHash, tallyContest, useElection } from "@/lib/election-store";
import { Switch } from "@/components/ui/switch";
import { Bar, Dot, Mono, Panel, PanelHeader, Pill, Segmented } from "../primitives";

export function Telemetry() {
  const { stats, ballots, contests, apiKeys, modules, simulating, setSimulating, certified } = useElection();
  const [weighted, setWeighted] = useState<"raw" | "weighted">("weighted");
  const [contestId, setContestId] = useState(contests[0]?.id);
  const [showRunoff, setShowRunoff] = useState(false);
  const contest = contests.find((c) => c.id === contestId) ?? contests[0];
  const w = weighted === "weighted";
  const securityOn = modules.filter((m) => m.enabled).length;

  const kpis = [
    { icon: Users, label: "Verified ballots cast", value: w ? stats.weightedCast.toFixed(1) : stats.voted.toString(), sub: w ? `${stats.voted} unique voters` : `${stats.weightedCast.toFixed(1)} weighted` },
    { icon: ShieldCheck, label: "Turnout & quorum", value: `${stats.turnout.toFixed(1)}%`, sub: stats.quorumMet ? "Constitutional quorum PASS" : `Below ${QUORUM}% quorum`, badge: stats.quorumMet },
    { icon: KeyRound, label: "Active API nodes", value: apiKeys.filter((k) => !k.revoked).length.toString(), sub: `${apiKeys.reduce((a, k) => a + k.calls, 0).toLocaleString()} calls` },
    { icon: Cpu, label: "Security posture", value: `${securityOn}/${modules.length}`, sub: certified ? "Results sealed" : "Modules armed" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={weighted} onChange={setWeighted} options={[{ value: "raw", label: "Raw headcount" }, { value: "weighted", label: "Weighted share" }]} />
        <label className="flex items-center gap-2 text-xs font-medium">
          <span className="flex items-center gap-1.5">{simulating && <Dot live />} Live remote voter traffic</span>
          <Switch checked={simulating} onCheckedChange={setSimulating} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Panel key={k.label} className="p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{k.label}</span>
              <k.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 font-mono text-3xl font-semibold tracking-tight">{k.value}</p>
            <div className="mt-2">{k.badge !== undefined ? <Pill solid={k.badge}>{k.sub}</Pill> : <p className="text-xs text-muted-foreground">{k.sub}</p>}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <PanelHeader
            title="Live contest tally"
            sub={contest?.type === "ranked" ? "First preferences · instant runoff available" : `Threshold ${contest?.threshold}%`}
            right={
              <select value={contest?.id} onChange={(e) => setContestId(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs">
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            }
          />
          {contest && <TallyBody contestId={contest.id} weighted={w} />}
          {contest?.type === "ranked" && (
            <div className="border-t border-hairline px-5 py-4">
              <label className="flex items-center justify-between text-xs font-medium">
                Instant runoff (STV) round simulator
                <Switch checked={showRunoff} onCheckedChange={setShowRunoff} />
              </label>
              {showRunoff && <RunoffView contestId={contest.id} weighted={w} />}
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader title="Departmental turnout" sub="Segmented by organisational unit" />
          <div className="space-y-4 p-5">
            {stats.byDept.map((d) => (
              <div key={d.dept}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium">{d.dept}</span>
                  <Mono>{d.voted}/{d.eligible} · {d.pct.toFixed(0)}%</Mono>
                </div>
                <Bar value={d.pct} marker={QUORUM} />
              </div>
            ))}
          </div>
          <div className="border-t border-hairline px-5 py-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold"><Dot live={simulating} /> Zero-knowledge hash stream</p>
            <div className="h-48 space-y-1 overflow-hidden">
              {[...ballots].reverse().slice(0, 9).map((b) => (
                <div key={b.id} className="animate-row-in flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5">
                  <Mono>{shortHash(b.hash)}</Mono>
                  <span className="text-[10px] text-muted-foreground">{b.channel} · {b.weight.toFixed(1)}x</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TallyBody({ contestId, weighted }: { contestId: string; weighted: boolean }) {
  const { contests, ballots } = useElection();
  const contest = contests.find((c) => c.id === contestId)!;
  const t = tallyContest(contest, ballots, weighted);
  const rows = [...contest.candidates.map((c) => ({ id: c.id, n: t.counts[c.id] ?? 0 })), { id: ABSTAIN, n: t.counts[ABSTAIN] }];
  if (t.writeIns) rows.push({ id: "__writein:(all)", n: t.writeIns });
  const max = Math.max(...rows.map((r) => r.n), 1);
  const decisive = contest.type === "resolution" ? (t.counts.approve ?? 0) + (t.counts.reject ?? 0) : 0;
  const approvePct = decisive ? ((t.counts.approve ?? 0) / decisive) * 100 : 0;
  return (
    <div className="space-y-3.5 p-5">
      {rows.sort((a, b) => b.n - a.n).map((r, i) => (
        <div key={r.id}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className={i === 0 && r.n > 0 ? "font-semibold" : ""}>{candidateName(contest, r.id)}</span>
            <Mono>{r.n.toFixed(weighted ? 1 : 0)} · {t.total ? ((r.n / t.total) * 100).toFixed(1) : "0.0"}%</Mono>
          </div>
          <Bar value={(r.n / max) * 100} />
        </div>
      ))}
      {contest.type === "resolution" && (
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-xs">
          <span>Approval among decisive votes: <b className="font-mono">{approvePct.toFixed(1)}%</b></span>
          <Pill solid={approvePct >= contest.threshold}>{approvePct >= contest.threshold ? "Supermajority met" : `Needs ${contest.threshold}%`}</Pill>
        </div>
      )}
    </div>
  );
}

function RunoffView({ contestId, weighted }: { contestId: string; weighted: boolean }) {
  const { contests, ballots } = useElection();
  const contest = contests.find((c) => c.id === contestId)!;
  const rounds = runoff(contest, ballots, weighted);
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {rounds.map((r) => {
        const total = Object.values(r.counts).reduce((a, b) => a + b, 0) || 1;
        return (
          <div key={r.round} className="rounded-xl border border-hairline p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
              Round {r.round}
              {r.winner ? <Pill solid>Elected: {candidateName(contest, r.winner)}</Pill> : r.eliminated ? <Pill>Eliminated: {candidateName(contest, r.eliminated)}</Pill> : null}
            </div>
            {Object.entries(r.counts).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
              <div key={id} className="mb-1.5">
                <div className="flex justify-between text-[11px]"><span>{candidateName(contest, id)}</span><Mono>{((n / total) * 100).toFixed(1)}%</Mono></div>
                <Bar value={(n / total) * 100} marker={50} thin />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
