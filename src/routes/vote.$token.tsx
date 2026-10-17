import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { castVote, getBallotByToken } from "@/lib/vote.functions";

export const Route = createFileRoute("/vote/$token")({
  head: () => ({
    meta: [
      { title: "Votia — Secure Ballot" },
      { name: "description", content: "Cast your ballot through your personal secure invite link." },
      { property: "og:title", content: "Votia — Secure Ballot" },
      { property: "og:description", content: "Cast your ballot securely and anonymously." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VotePage,
});

function VotePage() {
  const { token } = Route.useParams();
  const fetchBallot = useServerFn(getBallotByToken);
  const cast = useServerFn(castVote);
  const [selection, setSelection] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: loadError, isLoading } = useQuery({
    queryKey: ["ballot", token],
    queryFn: () => fetchBallot({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return <Shell><p className="text-sm text-muted-foreground">Loading your secure ballot…</p></Shell>;
  }
  if (loadError || !data) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Invite link not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError instanceof Error ? loadError.message : "This link is invalid or has been revoked. Contact your election organiser."}
        </p>
      </Shell>
    );
  }

  const { election, candidates, documents, criteria, alreadyVoted } = data;

  if (receipt || alreadyVoted) {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto h-10 w-10 text-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Ballot recorded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your vote was cast anonymously. Keep this receipt hash to verify inclusion in the tally:
        </p>
        {receipt && (
          <p className="mt-3 break-all rounded-lg bg-surface-2 p-3 font-mono text-xs">{receipt}</p>
        )}
      </Shell>
    );
  }

  const submit = async () => {
    if (!selection) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cast({ data: { token, selections: { [election.id]: selection } } });
      setReceipt(res.receiptHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cast your ballot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell wide>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{election.title}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Official Ballot</h1>
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Your identity is never stored with your choices. This link works once.
        </p>
        {election.description && <p className="mt-3 text-sm text-muted-foreground">{election.description}</p>}
      </div>

      {documents.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" /> Documents</h2>
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="rounded-xl border border-hairline bg-card p-3">
                <p className="text-sm font-medium">{d.title}</p>
                {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs underline">Open document</a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {criteria.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">Decision criteria</h2>
          <div className="flex flex-wrap gap-2">
            {criteria.map((c) => (
              <span key={c.id} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                {c.label} ×{c.weight}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Candidates — choose one</h2>
        <div className="space-y-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelection(c.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selection === c.id ? "border-foreground bg-surface-2" : "border-hairline bg-card hover:bg-muted/50"
              }`}
            >
              <p className="font-medium">{c.name}</p>
              {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
              {c.manifesto && <p className="mt-1 text-sm text-muted-foreground">{c.manifesto}</p>}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="mb-3 rounded-lg bg-surface-2 p-3 text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={!selection || busy}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Casting ballot…" : "Cast my ballot"}
      </button>
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className={`mx-auto ${wide ? "max-w-xl" : "max-w-sm text-center"}`}>
        <div className={`mb-6 flex items-center gap-2 ${wide ? "" : "justify-center"}`}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">V</div>
          <span className="font-semibold tracking-tight">Votia</span>
        </div>
        {children}
      </div>
    </div>
  );
}
