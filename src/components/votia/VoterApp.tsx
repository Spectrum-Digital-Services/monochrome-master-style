import { useMemo, useState } from "react";
import { Activity, BadgeCheck, ChevronDown, Fingerprint, IdCard, Lock, ScanFace, ShieldCheck, Vote, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ABSTAIN,
  QUORUM,
  WRITEIN_PREFIX,
  candidateName,
  shortHash,
  tallyContest,
  useElection,
  type Contest,
  type Selection,
} from "@/lib/election-store";
import { Bar, Mono, Pill, QrGlyph, Ring } from "./primitives";

type Tab = "ballot" | "turnout" | "receipt" | "pass";

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[780px] w-[372px] shrink-0 overflow-hidden rounded-[52px] bg-background shadow-device">
      <div className="absolute left-1/2 top-2.5 z-40 h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-ink" />
      <div className="flex items-center justify-between px-8 pt-4 text-[13px] font-semibold">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-4 rounded-sm border border-foreground" />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-11">{children}</div>
    </div>
  );
}

export function VoterApp() {
  const { voters, activeToken, setActiveToken, contests } = useElection();
  const [tab, setTab] = useState<Tab>("ballot");
  const [picker, setPicker] = useState(false);
  const voter = voters.find((v) => v.token === activeToken) ?? voters[0];

  return (
    <div className="relative flex h-full flex-col">
      <header className="glass z-20 border-b border-hairline px-5 pb-3 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Meridian Cooperative</p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-[22px] font-bold tracking-tight">
            {tab === "ballot" ? "Ballot" : tab === "turnout" ? "Turnout" : tab === "receipt" ? "Receipt" : "Voter Pass"}
          </h1>
          <button
            onClick={() => setPicker(true)}
            className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 active:scale-[0.97]"
          >
            <Mono className="font-semibold">{voter.token}</Mono>
            <span className="text-[11px] text-muted-foreground">· {voter.weight.toFixed(1)}x</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </header>

      <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {tab === "ballot" && <BallotTab key={voter.token + contests.length} onCast={() => setTab("receipt")} />}
        {tab === "turnout" && <TurnoutTab />}
        {tab === "receipt" && <ReceiptTab />}
        {tab === "pass" && <PassTab />}
      </div>

      <nav className="glass absolute inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-hairline px-2 pb-7 pt-2">
        {(
          [
            ["ballot", Vote, "Ballot"],
            ["turnout", Activity, "Turnout"],
            ["receipt", ShieldCheck, "Receipt"],
            ["pass", IdCard, "Pass"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn("flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium", tab === id ? "text-foreground" : "text-muted-foreground")}
          >
            <Icon className="h-5 w-5" strokeWidth={tab === id ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </nav>

      {picker && (
        <Sheet onClose={() => setPicker(false)} title="Switch voter token">
          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {voters.slice(0, 40).map((v) => (
              <button
                key={v.token}
                onClick={() => {
                  setActiveToken(v.token);
                  setPicker(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left active:scale-[0.99]",
                  v.token === activeToken ? "bg-primary text-primary-foreground" : "bg-surface-2",
                )}
              >
                <span>
                  <Mono className="font-semibold">{v.token}</Mono>
                  <span className="ml-2 text-xs opacity-70">{v.name}</span>
                </span>
                <span className="text-[11px] opacity-80">
                  {v.weight.toFixed(1)}x · {v.status}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-ink/40 animate-in fade-in" onClick={onClose} />
      <div className="relative rounded-t-[28px] bg-surface px-5 pb-10 pt-3 animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-muted p-1.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BallotTab({ onCast }: { onCast: () => void }) {
  const { contests, voters, activeToken, castBallot, modules } = useElection();
  const voter = voters.find((v) => v.token === activeToken)!;
  const [sel, setSel] = useState<Record<string, Selection>>({});
  const [writeIn, setWriteIn] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState(false);
  const [stage, setStage] = useState<"review" | "scan" | "done">("review");
  const passkey = modules.find((m) => m.id === "passkey")?.enabled;

  if (voter.status === "Voted")
    return (
      <div className="mt-16 text-center">
        <BadgeCheck className="mx-auto h-12 w-12" strokeWidth={1.5} />
        <h2 className="mt-3 text-lg font-semibold">Ballot sealed</h2>
        <p className="mx-auto mt-1 max-w-[240px] text-sm text-muted-foreground">
          {voter.token} has already voted. Switch tokens above to cast another ballot.
        </p>
      </div>
    );
  if (voter.status === "Bounced")
    return (
      <div className="mt-16 text-center">
        <Lock className="mx-auto h-12 w-12" strokeWidth={1.5} />
        <h2 className="mt-3 text-lg font-semibold">Token revoked</h2>
        <p className="mt-1 text-sm text-muted-foreground">This access key is not eligible to vote.</p>
      </div>
    );

  const complete = contests.every((c) => {
    const s = sel[c.id];
    return s !== undefined && (!Array.isArray(s) || s.length > 0);
  });

  const finalSelections = () => {
    const out: Record<string, Selection> = {};
    for (const c of contests) {
      const s = sel[c.id];
      out[c.id] = s === "__writein" ? `${WRITEIN_PREFIX}${writeIn[c.id] || "Unnamed"}` : s;
    }
    return out;
  };

  const doCast = () => {
    setStage("scan");
    setTimeout(
      () => {
        const b = castBallot(voter.token, finalSelections(), passkey ? "iOS Passkey" : "Mobile Web");
        setStage("done");
        if (b) toast.success("Ballot sealed", { description: `Tracker ${shortHash(b.hash)}` });
        setTimeout(() => {
          setSheet(false);
          onCast();
        }, 1100);
      },
      passkey ? 1800 : 600,
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-2xl bg-primary p-4 text-primary-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-[12px] leading-relaxed opacity-90">
          <span className="font-semibold">Zero-knowledge ballot.</span> Your identity is decoupled from your choices. You'll receive a tracker hash to verify your vote was counted.
        </p>
      </div>

      {contests.map((c, idx) => (
        <section key={c.id}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              {idx + 1}. {c.title}
            </h2>
          </div>
          <div className="mb-2 flex gap-1.5 px-1">
            <Pill>{c.type === "plurality" ? "Single choice" : c.type === "ranked" ? "Ranked choice" : c.type === "approval" ? "Approve any" : `Supermajority ${c.threshold}%`}</Pill>
          </div>
          <ContestInput contest={c} value={sel[c.id]} onChange={(v) => setSel((s) => ({ ...s, [c.id]: v }))} writeIn={writeIn[c.id] ?? ""} onWriteIn={(t) => setWriteIn((w) => ({ ...w, [c.id]: t }))} />
        </section>
      ))}

      <button
        disabled={!complete}
        onClick={() => {
          setStage("review");
          setSheet(true);
        }}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-30"
      >
        <Fingerprint className="h-5 w-5" /> Verify & Cast Official Ballot
      </button>

      {sheet && (
        <Sheet title={stage === "review" ? "Confirm your ballot" : stage === "scan" ? "Authenticating" : "Sealed"} onClose={() => stage === "review" && setSheet(false)}>
          {stage === "review" && (
            <div className="space-y-3">
              <div className="divide-y divide-hairline rounded-2xl bg-surface-2">
                {contests.map((c) => {
                  const s = finalSelections()[c.id];
                  return (
                    <div key={c.id} className="px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">{c.title}</p>
                      <p className="text-sm font-medium">{Array.isArray(s) ? s.map((id, i) => (c.type === "ranked" ? `${i + 1}. ` : "") + candidateName(c, id)).join("  ·  ") : candidateName(c, s)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Voting weight applied</span>
                <span className="font-mono font-semibold">{voter.weight.toFixed(1)}x</span>
              </div>
              <button onClick={doCast} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground active:scale-[0.99]">
                <ScanFace className="h-5 w-5" /> {passkey ? "Confirm with Face ID" : "Confirm & Seal"}
              </button>
            </div>
          )}
          {stage !== "review" && (
            <div className="flex flex-col items-center py-6">
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] border-2 border-foreground">
                {stage === "scan" ? (
                  <>
                    <ScanFace className="h-14 w-14" strokeWidth={1.2} />
                    <div className="animate-scan absolute inset-x-0 top-1/2 h-0.5 bg-foreground" />
                  </>
                ) : (
                  <BadgeCheck className="h-14 w-14 animate-in zoom-in" strokeWidth={1.4} />
                )}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{stage === "scan" ? "Secure enclave signing…" : "Ballot encrypted & counted"}</p>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}

function ContestInput({
  contest,
  value,
  onChange,
  writeIn,
  onWriteIn,
}: {
  contest: Contest;
  value: Selection | undefined;
  onChange: (v: Selection) => void;
  writeIn: string;
  onWriteIn: (t: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (contest.type === "resolution") {
    const opts = [...contest.candidates.map((c) => ({ id: c.id, label: c.name })), ...(contest.allowAbstain ? [{ id: ABSTAIN, label: "Abstain" }] : [])];
    return (
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn("min-h-[48px] rounded-2xl text-sm font-semibold transition active:scale-[0.98]", value === o.id ? "bg-primary text-primary-foreground" : "bg-surface")}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  const ranks = Array.isArray(value) ? value : [];
  const toggle = (id: string) => {
    if (contest.type === "ranked" || contest.type === "approval") {
      onChange(ranks.includes(id) ? ranks.filter((x) => x !== id) : [...ranks, id]);
    } else onChange(id);
  };

  return (
    <div className="divide-y divide-hairline overflow-hidden rounded-2xl bg-surface">
      {contest.candidates.map((c) => {
        const rank = ranks.indexOf(c.id);
        const active = contest.type === "plurality" ? value === c.id : rank >= 0;
        return (
          <div key={c.id}>
            <div className="flex min-h-[56px] items-center gap-3 px-3.5 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                <p className="truncate text-[15px] font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.role} · <span className="underline">Bio</span></p>
              </button>
              <button
                onClick={() => toggle(c.id)}
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-1 text-xs font-bold transition active:scale-95",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {contest.type === "ranked" ? (rank >= 0 ? `${rank + 1}` : "") : active ? "✓" : ""}
              </button>
            </div>
            {open === c.id && <p className="animate-in fade-in px-4 pb-3 pl-[66px] text-xs leading-relaxed text-muted-foreground">{c.manifesto || "No manifesto submitted."}</p>}
          </div>
        );
      })}
      {contest.type === "ranked" && ranks.length > 0 && (
        <button onClick={() => onChange([])} className="w-full px-4 py-2.5 text-left text-xs text-muted-foreground">
          Reset ranking
        </button>
      )}
      {contest.allowWriteIn && contest.type === "plurality" && (
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <input
            value={writeIn}
            onChange={(e) => {
              onWriteIn(e.target.value);
              onChange("__writein");
            }}
            placeholder="Write-in candidate"
            className="min-h-[36px] flex-1 rounded-lg bg-muted px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
      {contest.allowAbstain && (
        <button
          onClick={() => onChange(contest.type === "plurality" ? ABSTAIN : [ABSTAIN])}
          className={cn("w-full px-4 py-3 text-left text-sm font-medium", (value === ABSTAIN || (Array.isArray(value) && value[0] === ABSTAIN)) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
        >
          Formally abstain
        </button>
      )}
    </div>
  );
}

function TurnoutTab() {
  const { stats, contests, ballots, publicStandings } = useElection();
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-3xl bg-surface p-6">
        <div className="relative">
          <Ring value={stats.turnout} marker={QUORUM} size={180} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-semibold tracking-tight">{stats.turnout.toFixed(1)}%</span>
            <span className="text-[11px] text-muted-foreground">of {stats.eligible} eligible</span>
          </div>
        </div>
        <Pill solid={stats.quorumMet} className="mt-4">
          {stats.quorumMet ? "Quorum reached" : `Quorum ${QUORUM}% required`}
        </Pill>
      </div>
      <div className="rounded-2xl bg-surface p-4">
        <h3 className="mb-3 text-[13px] font-semibold">Department leaderboard</h3>
        <div className="space-y-3">
          {[...stats.byDept].sort((a, b) => b.pct - a.pct).map((d, i) => (
            <div key={d.dept}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{i + 1}. {d.dept}</span>
                <span className="font-mono">{d.pct.toFixed(0)}%</span>
              </div>
              <Bar value={d.pct} thin />
            </div>
          ))}
        </div>
      </div>
      {publicStandings && (
        <div className="rounded-2xl bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Live public standings</h3>
          {contests.map((c) => {
            const t = tallyContest(c, ballots, true);
            const lead = Object.entries(t.counts).filter(([k]) => k !== ABSTAIN).sort((a, b) => b[1] - a[1])[0];
            return (
              <div key={c.id} className="flex justify-between border-b border-hairline py-2 text-xs last:border-0">
                <span className="text-muted-foreground">{c.title}</span>
                <span className="font-medium">{lead ? candidateName(c, lead[0]) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReceiptTab() {
  const { ballots, activeToken, setHighlightHash, setConsoleModule, setWorkspace, workspace } = useElection();
  const b = useMemo(() => [...ballots].reverse().find((x) => x.token === activeToken), [ballots, activeToken]);
  if (!b)
    return (
      <div className="mt-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" strokeWidth={1.4} />
        <p className="mt-3 text-sm text-muted-foreground">No receipt yet for {activeToken}. Cast your ballot first.</p>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <p className="text-[11px] uppercase tracking-widest opacity-70">Smart tracker hash</p>
        <p className="mt-2 font-mono text-2xl font-semibold">{shortHash(b.hash)}</p>
        <p className="mt-3 break-all font-mono text-[10px] leading-relaxed opacity-60">{b.hash}</p>
      </div>
      <div className="divide-y divide-hairline rounded-2xl bg-surface text-sm">
        {[
          ["Timestamp", new Date(b.ts).toLocaleString()],
          ["Channel", b.channel],
          ["Weight", `${b.weight.toFixed(1)}x`],
          ["Board counter-signature", `ecdsa:${b.signature.slice(0, 14)}…`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3">
            <span className="text-muted-foreground">{k}</span>
            <span className="truncate font-mono text-xs">{v}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          setHighlightHash(b.hash);
          setConsoleModule("ledger");
          if (workspace === "voter") setWorkspace("dual");
          toast("Receipt located on the public ledger", { description: "Your choices remain hidden." });
        }}
        className="min-h-[50px] w-full rounded-2xl border border-foreground text-sm font-semibold active:scale-[0.99]"
      >
        Verify Receipt on Public Ledger
      </button>
    </div>
  );
}

function PassTab() {
  const { voters, activeToken } = useElection();
  const v = voters.find((x) => x.token === activeToken)!;
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="text-sm font-semibold">Votia · AGM 2026</span>
          <Mono>{v.token}</Mono>
        </div>
        <div className="px-5 pt-4">
          <p className="text-[11px] uppercase tracking-widest opacity-60">Member</p>
          <p className="text-xl font-semibold">{v.name}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 px-5 pt-4 text-xs">
          <div><p className="opacity-60">Unit</p><p className="font-medium">{v.dept}</p></div>
          <div><p className="opacity-60">Weight</p><p className="font-mono font-medium">{v.weight.toFixed(1)}x</p></div>
          <div><p className="opacity-60">Status</p><p className="font-medium">{v.status}</p></div>
        </div>
        <div className="m-5 rounded-2xl bg-paper p-4">
          <QrGlyph seed={v.token.replace(/\W/g, "") + "a3f9c1e7b2d4"} />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Present this pass at in-person AGM kiosks for strike-off.</p>
    </div>
  );
}
