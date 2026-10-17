import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, FileText, Plus, Trash2, Users, Vote, ListChecks, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  addCandidate,
  addCriterion,
  addDocument,
  addInvite,
  createElection,
  getElectionDetail,
  listMyElections,
  removeCandidate,
  removeCriterion,
  removeDocument,
  removeInvite,
  updateElection,
} from "@/lib/elections.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Votia — Organiser Console" },
      { name: "description", content: "Create election events, manage candidates, documents, decision criteria and voter invites." },
      { property: "og:title", content: "Votia — Organiser Console" },
      { property: "og:description", content: "Create and manage secure election events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground";
const btn = "rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const fetchElections = useServerFn(listMyElections);
  const { data: elections } = useQuery({ queryKey: ["elections"], queryFn: () => fetchElections({}) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["elections"] });
    if (selected) queryClient.invalidateQueries({ queryKey: ["election", selected] });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-hairline px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">V</div>
          <span className="text-lg font-semibold tracking-tight">Votia Console</span>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {!selected ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Election Events</h1>
              <button onClick={() => setShowNew(true)} className={btn}>
                <span className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> New election</span>
              </button>
            </div>
            {showNew && <NewElectionForm onDone={(id) => { setShowNew(false); refresh(); setSelected(id); }} onCancel={() => setShowNew(false)} />}
            <div className="grid gap-4 md:grid-cols-2">
              {(elections ?? []).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  className="rounded-2xl border border-hairline bg-card p-5 text-left shadow-card hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{e.title}</h2>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-secondary-foreground">{e.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.description || "No description"}</p>
                </button>
              ))}
              {elections && elections.length === 0 && !showNew && (
                <p className="col-span-2 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  No election events yet. Create your first one to invite voters.
                </p>
              )}
            </div>
          </>
        ) : (
          <ElectionDetail electionId={selected} onBack={() => { setSelected(null); refresh(); }} onChanged={refresh} />
        )}
      </main>
    </div>
  );
}

function NewElectionForm({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const create = useServerFn(createElection);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mb-6 space-y-3 rounded-2xl border border-hairline bg-card p-5 shadow-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const row = await create({ data: { title, description } });
          toast.success("Election event created");
          onDone(row.id);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to create election");
          setBusy(false);
        }
      }}
    >
      <input className={field} placeholder="Election title (e.g. AGM 2026 Board Election)" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea className={field} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btn}>Create</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Cancel</button>
      </div>
    </form>
  );
}

function ElectionDetail({ electionId, onBack, onChanged }: { electionId: string; onBack: () => void; onChanged: () => void }) {
  const fetchDetail = useServerFn(getElectionDetail);
  const update = useServerFn(updateElection);
  const { data } = useQuery({ queryKey: ["election", electionId], queryFn: () => fetchDetail({ data: { electionId } }) });

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { election, candidates, documents, criteria, invites, ballots } = data;

  const setStatus = async (status: string) => {
    await update({ data: { electionId, patch: { status } } });
    toast.success(`Election ${status}`);
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← All elections</button>
          <h1 className="text-2xl font-semibold tracking-tight">{election.title}</h1>
          <p className="text-sm text-muted-foreground">{election.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize text-secondary-foreground">{election.status}</span>
          {election.status === "draft" && <button onClick={() => setStatus("open")} className={btn}>Open voting</button>}
          {election.status === "open" && <button onClick={() => setStatus("closed")} className={btn}>Close voting</button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Invited voters" value={invites.length} />
        <Stat icon={Vote} label="Ballots cast" value={ballots.length} />
        <Stat icon={ListChecks} label="Candidates" value={candidates.length} />
      </div>

      <Section title="Candidates" icon={Users}>
        <CandidateEditor electionId={electionId} candidates={candidates} onChanged={onChanged} />
      </Section>

      <Section title="Documents" icon={FileText}>
        <DocumentEditor electionId={electionId} documents={documents} onChanged={onChanged} />
      </Section>

      <Section title="Decision matrix" icon={ListChecks}>
        <CriteriaEditor electionId={electionId} criteria={criteria} onChanged={onChanged} />
      </Section>

      <Section title="Invited voters" icon={Users}>
        <InviteEditor electionId={electionId} invites={invites} onChanged={onChanged} />
      </Section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-card shadow-card">
      <header className="flex items-center gap-2 border-b border-hairline px-5 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

type Candidate = { id: string; name: string; role: string; manifesto: string };

function CandidateEditor({ electionId, candidates, onChanged }: { electionId: string; candidates: Candidate[]; onChanged: () => void }) {
  const add = useServerFn(addCandidate);
  const remove = useServerFn(removeCandidate);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [manifesto, setManifesto] = useState("");

  return (
    <div className="space-y-3">
      <div className="divide-y divide-hairline rounded-xl border border-hairline">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
            </div>
            <button onClick={async () => { await remove({ data: { id: c.id } }); onChanged(); }} className="text-muted-foreground hover:text-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!candidates.length && <p className="px-3 py-3 text-xs text-muted-foreground">No candidates yet.</p>}
      </div>
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await add({ data: { electionId, name, role, manifesto } });
          setName(""); setRole(""); setManifesto("");
          onChanged();
        }}
      >
        <input className={field} placeholder="Candidate name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={field} placeholder="Role / title" value={role} onChange={(e) => setRole(e.target.value)} />
        <input className={`${field} col-span-2`} placeholder="Manifesto" value={manifesto} onChange={(e) => setManifesto(e.target.value)} />
        <button className={`${btn} col-span-2`}>Add candidate</button>
      </form>
    </div>
  );
}

type Doc = { id: string; title: string; url: string; notes: string };

function DocumentEditor({ electionId, documents, onChanged }: { electionId: string; documents: Doc[]; onChanged: () => void }) {
  const add = useServerFn(addDocument);
  const remove = useServerFn(removeDocument);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3">
      <div className="divide-y divide-hairline rounded-xl border border-hairline">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-medium">{d.title}</p>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">{d.url}</a>}
            </div>
            <button onClick={async () => { await remove({ data: { id: d.id } }); onChanged(); }} className="text-muted-foreground hover:text-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!documents.length && <p className="px-3 py-3 text-xs text-muted-foreground">No documents attached.</p>}
      </div>
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await add({ data: { electionId, title, url, notes } });
          setTitle(""); setUrl(""); setNotes("");
          onChanged();
        }}
      >
        <input className={field} placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className={field} placeholder="Link (URL)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className={`${field} col-span-2`} placeholder="Notes for voters" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className={`${btn} col-span-2`}>Add document</button>
      </form>
    </div>
  );
}

type Criterion = { id: string; label: string; weight: number };

function CriteriaEditor({ electionId, criteria, onChanged }: { electionId: string; criteria: Criterion[]; onChanged: () => void }) {
  const add = useServerFn(addCriterion);
  const remove = useServerFn(removeCriterion);
  const [label, setLabel] = useState("");
  const [weight, setWeight] = useState(1);

  return (
    <div className="space-y-3">
      <div className="divide-y divide-hairline rounded-xl border border-hairline">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-medium">{c.label}</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">×{c.weight}</span>
              <button onClick={async () => { await remove({ data: { id: c.id } }); onChanged(); }} className="text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!criteria.length && <p className="px-3 py-3 text-xs text-muted-foreground">No decision criteria yet.</p>}
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await add({ data: { electionId, label, weight } });
          setLabel(""); setWeight(1);
          onChanged();
        }}
      >
        <input className={field} placeholder="Criterion (e.g. Experience)" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <input className={`${field} w-24`} type="number" min={1} step={0.5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} title="Weight" />
        <button className={btn}>Add</button>
      </form>
    </div>
  );
}

type Invite = { id: string; email: string; name: string; token: string; status: string };

function InviteEditor({ electionId, invites, onChanged }: { electionId: string; invites: Invite[]; onChanged: () => void }) {
  const add = useServerFn(addInvite);
  const remove = useServerFn(removeInvite);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/vote/${token}`);
    toast.success("Secure invite link copied");
  };

  return (
    <div className="space-y-3">
      <div className="divide-y divide-hairline rounded-xl border border-hairline">
        {invites.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-medium">{i.name || i.email}</p>
              <p className="text-xs text-muted-foreground">{i.email} · <span className="capitalize">{i.status}</span></p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => copyLink(i.token)} title="Copy invite link" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button onClick={async () => { await remove({ data: { id: i.id } }); onChanged(); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!invites.length && <p className="px-3 py-3 text-xs text-muted-foreground">No voters invited yet.</p>}
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await add({ data: { electionId, email, name } });
          setEmail(""); setName("");
          onChanged();
        }}
      >
        <input className={field} placeholder="Voter name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={field} type="email" placeholder="voter@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className={btn}>Invite</button>
      </form>
      <p className="text-xs text-muted-foreground">
        Each invite gets a unique secure link. The ballot it casts stores no voter identity — only the choices and a receipt hash.
      </p>
    </div>
  );
}
